<?php
declare(strict_types=1);
$method=$_SERVER['REQUEST_METHOD'];
if($method==='OPTIONS') fail('Cross-origin requests are not supported',405);
maintenance();
if(str_starts_with($path,'/api/ea/')) {
    if($method!=='POST') fail('POST required',405);
    $b=body();
    if($path==='/api/ea/pair') {
        $code=normalize_pairing_code(strval_input($b,'code',20));
        $login=strval_input($b,'login',30); if(!preg_match('/^\d+$/',$login)) fail('Invalid account identity');
        $server=strval_input($b,'server',100);
        $terminalName=trim((string)($b['account_name']??'')); if($terminalName!==''&&(strlen($terminalName)>60||preg_match('/[\x00-\x1F\x7F]/',$terminalName))) fail('Invalid account_name');
        $terminalSymbol=trim((string)($b['symbol']??'')); if($terminalSymbol!==''&&(strlen($terminalSymbol)>40||preg_match('/[\x00-\x1F\x7F]/',$terminalSymbol))) fail('Invalid symbol');
        $token=bin2hex(random_bytes(32));
        $result=transaction(function()use($code,$login,$server,$terminalName,$terminalSymbol,$token){
            $p=one("SELECT * FROM pairings WHERE code_hash=? AND status='pending' AND expires_at>=?",[hash('sha256',$code),time()]);
            if(!$p) fail('Pairing code is invalid or expired',404);
            $name=$p['label']!==''?$p['label']:($terminalName!==''?$terminalName:'MT5 '.$login);
            $symbol=$terminalSymbol!==''?$terminalSymbol:$p['symbol'];
            $existing=one('SELECT * FROM accounts WHERE login=? AND server=?',[$login,$server]);
            if($existing) {
                $id=(int)$existing['id'];
                query('UPDATE accounts SET name=?,symbol=?,token_hash=?,enabled=1,bot_message=? WHERE id=?',[$name,$symbol,hash('sha256',$token),'Paired; awaiting heartbeat',$id]);
                query("UPDATE bots SET desired='stopped',version=version+1,updated_at=? WHERE account_id=?",[time(),$id]);
                query("UPDATE commands SET status='cancelled',message='Account re-paired',updated_at=? WHERE account_id=? AND status='queued'",[time(),$id]);
            } else {
                query('INSERT INTO accounts(name,login,server,symbol,token_hash,created_at,bot_message) VALUES(?,?,?,?,?,?,?)',[$name,$login,$server,$symbol,hash('sha256',$token),time(),'Paired; awaiting heartbeat']);
                $id=(int)db()->lastInsertId();
                query('INSERT INTO bots(account_id,updated_at) VALUES(?,?)',[$id,time()]);
            }
            query("UPDATE pairings SET status='claimed',account_id=?,claimed_at=? WHERE id=?",[$id,time(),$p['id']]);
            audit('account.paired',['id'=>$id,'login'=>$login,'server'=>$server]);
            return ['id'=>$id,'name'=>$name,'symbol'=>$symbol,'token'=>$token];
        });
        json_response($result,201);
    }
    $a=ea_account($b); $id=(int)$a['id'];
    if($path==='/api/ea/sync') {
        $currency=strval_input($b,'currency',12);
        $positions=$b['positions']??[];
        if(!is_array($positions)||count($positions)>500) fail('Invalid positions');
        $clean=[];
        foreach($positions as $p) {
            if(!is_array($p)) fail('Invalid position');
            $clean[]=['ticket'=>strval_input($p,'ticket',30),'symbol'=>strval_input($p,'symbol',40),
                'side'=>strval_input($p,'side',8),'volume'=>number($p,'volume',0,1e9),
                'price'=>number($p,'price',0,1e12),'profit'=>number($p,'profit',-1e12,1e12)];
        }
        $mode=strval_input($b,'mode',12); if(!in_array($mode,['demo','real','contest'],true)) fail('Invalid mode');
        $v=integer($b,'bot_applied',0,2147483647);
        query('UPDATE accounts SET currency=?,balance=?,equity=?,floating=?,margin=?,last_seen=?,trade_allowed=?,mode=?,positions=?,bot_applied=?,bot_message=? WHERE id=?',[
            $currency,number($b,'balance',-1e12,1e12),number($b,'equity',-1e12,1e12),number($b,'floating',-1e12,1e12),number($b,'margin',0,1e12),time(),
            integer($b,'trade_allowed',0,1),$mode,json_encode($clean),$v,optional_string($b,'bot_message',180,'Awaiting EA'),$id]);
        $commands=transaction(function()use($id){
            $cs=rows("SELECT * FROM commands WHERE account_id=? AND status IN ('queued','delivered','unknown','accepted','partially_filled') ORDER BY updated_at,id LIMIT 20",[$id]);
            foreach($cs as $c) if($c['status']==='queued') query("UPDATE commands SET status='delivered',updated_at=? WHERE id=?",[time(),$c['id']]);
            return $cs;
        });
        header('Content-Type: text/plain; charset=utf-8');
        echo "TIME\t".time()."\n";
        $bot=one('SELECT * FROM bots WHERE account_id=?',[$id]); $cfg=json_decode($bot['config'],true);
        echo implode("\t",['BOT',$bot['version'],$bot['desired'],$a['symbol'],$cfg['lots']??0.01,$cfg['max_positions']??1,$cfg['max_volume']??0.05,$cfg['spread']??50,$cfg['daily_loss']??50,$cfg['cooldown']??120,$cfg['atr_sl']??1.5,$cfg['atr_tp']??2,$cfg['entry_min']??0,$cfg['entry_max']??0,$bot['expires_at']])."\n";
        foreach($commands as $c) {
            $p=json_decode($c['payload'],true);
            echo implode("\t",['CMD',$c['id'],$p['type'],$p['symbol'],$p['lots'],$p['entry'],$p['sl'],$p['tp'],$c['expires_at'],700000000+(int)$c['id'],$c['status']])."\n";
        }
        exit;
    }
    if($path==='/api/ea/receipt') {
        $cid=integer($b,'command_id',1,1000000000); $status=strval_input($b,'status',24);
        if(!in_array($status,['unknown','accepted','partially_filled','filled','cancelled','expired','rejected'],true)) fail('Invalid receipt status');
        $ticket=(string)($b['ticket']??''); if(!preg_match('/^\d{0,30}$/',$ticket)) fail('Invalid ticket');
        $msg=optional_string($b,'message',180); $code=(string)($b['retcode']??''); if(!preg_match('/^\d{0,12}$/',$code)) fail('Invalid retcode');
        transaction(function()use($cid,$id,$status,$ticket,$msg,$code){
            $c=one('SELECT * FROM commands WHERE id=? AND account_id=?',[$cid,$id]); if(!$c) fail('Command not found',404);
            $terminal=['filled','cancelled','expired','rejected'];
            if(in_array($c['status'],$terminal,true)) return;
            if($c['status']==='queued') fail('Command has not been delivered',409);
            if(in_array($c['status'],['accepted','partially_filled'],true)&&in_array($status,['unknown','rejected'],true)) return;
            if($c['status']==='partially_filled' && $status==='accepted') return;
            query('UPDATE commands SET status=?,ticket=?,message=?,retcode=?,updated_at=? WHERE id=?',[$status,$ticket,$msg,$code,time(),$cid]);
        });
        json_response(['ok'=>true]);
    }
    if($path==='/api/ea/deals') {
        $deals=$b['deals']??null; if(!is_array($deals)||count($deals)>200) fail('Expected at most 200 deals');
        $valid=[];
        foreach($deals as $d) {
            if(!is_array($d)) fail('Invalid deal');
            foreach(['ticket','order_ticket','position_id','magic'] as $key) if(!is_string($d[$key]??null)||!preg_match('/^\d{1,30}$/',$d[$key])) fail('Invalid '.$key);
            $side=strval_input($d,'side',10); if(!in_array($side,['buy','sell','cash'],true)) fail('Invalid deal side');
            $valid[]=[$id,$d['ticket'],$d['order_ticket'],$d['position_id'],(string)($d['symbol']??''),$side,strval_input($d,'entry',12),
                number($d,'volume',0,1e9),number($d,'price',0,1e12),number($d,'profit',-1e12,1e12),number($d,'commission',-1e12,1e12),number($d,'swap',-1e12,1e12),number($d,'fee',-1e12,1e12),$d['magic'],integer($d,'time',0,4102444800),substr((string)($d['comment']??''),0,200)];
        }
        transaction(function()use($valid){foreach($valid as $d) query('INSERT INTO deals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,ticket) DO UPDATE SET profit=excluded.profit,commission=excluded.commission,swap=excluded.swap,fee=excluded.fee', $d);});
        json_response(['ok'=>true,'received'=>count($valid)]);
    }
    fail('Endpoint not found',404);
}
start_session();
if($method!=='GET' && !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) fail('Refresh the page and try again (CSRF token missing)',403);
$csrf=$_SESSION['csrf'];
session_write_close();
if($method==='GET' && $path==='/api/session') json_response(['csrf'=>$csrf]);
if($method==='GET' && $path==='/api/state') {
    $accounts=rows('SELECT a.id,a.name,a.login,a.server,a.symbol,a.enabled,a.currency,a.balance,a.equity,a.floating,a.margin,a.last_seen,a.trade_allowed,a.mode,a.positions,a.bot_applied,a.bot_message,b.version,b.desired,b.config,b.run_id,b.started_at,b.expires_at FROM accounts a JOIN bots b ON b.account_id=a.id ORDER BY a.id');
    foreach($accounts as &$a){ $a['positions']=json_decode($a['positions'],true); $a['config']=json_decode($a['config'],true); $a['online']=$a['enabled'] && $a['last_seen'] && time()-(int)$a['last_seen']<15; }
    unset($a);
    $stats=rows("SELECT a.currency,COUNT(*) deals,COALESCE(SUM(d.profit+d.commission+d.swap+d.fee),0) net, SUM(CASE WHEN d.entry IN ('out','out_by','inout') THEN 1 ELSE 0 END) exits,SUM(CASE WHEN d.entry IN ('out','out_by','inout') AND d.profit+d.commission+d.swap+d.fee>0 THEN 1 ELSE 0 END) wins FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') GROUP BY a.currency");
    $accountStats=rows("SELECT a.id account_id,a.currency,COUNT(*) deals,COALESCE(SUM(d.profit+d.commission+d.swap+d.fee),0) net, SUM(CASE WHEN d.entry IN ('out','out_by','inout') THEN 1 ELSE 0 END) exits,SUM(CASE WHEN d.entry IN ('out','out_by','inout') AND d.profit+d.commission+d.swap+d.fee>0 THEN 1 ELSE 0 END) wins FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') GROUP BY a.id,a.currency");
    $periodStats=[];
    $accountPeriodStats=[];
    $periods=['today'=>strtotime('today'),'week'=>time()-6*86400,'month'=>strtotime(date('Y-m-01 00:00:00'))];
    foreach($periods as $period=>$from) foreach(rows("SELECT a.currency,? period,COUNT(*) deals,COALESCE(SUM(d.profit+d.commission+d.swap+d.fee),0) net, SUM(CASE WHEN d.entry IN ('out','out_by','inout') THEN 1 ELSE 0 END) exits,SUM(CASE WHEN d.entry IN ('out','out_by','inout') AND d.profit+d.commission+d.swap+d.fee>0 THEN 1 ELSE 0 END) wins FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') AND d.time>=? GROUP BY a.currency",[$period,$from]) as $row) $periodStats[]=$row;
    foreach($periods as $period=>$from) foreach(rows("SELECT a.id account_id,a.currency,? period,COUNT(*) deals,COALESCE(SUM(d.profit+d.commission+d.swap+d.fee),0) net, SUM(CASE WHEN d.entry IN ('out','out_by','inout') THEN 1 ELSE 0 END) exits,SUM(CASE WHEN d.entry IN ('out','out_by','inout') AND d.profit+d.commission+d.swap+d.fee>0 THEN 1 ELSE 0 END) wins FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') AND d.time>=? GROUP BY a.id,a.currency",[$period,$from]) as $row) $accountPeriodStats[]=$row;
    $chart=rows("SELECT a.currency,date(d.time,'unixepoch') day,SUM(d.profit+d.commission+d.swap+d.fee) net FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') AND d.time>=? GROUP BY a.currency,day ORDER BY day",[time()-30*86400]);
    $accountChart=rows("SELECT a.id account_id,a.currency,date(d.time,'unixepoch') day,SUM(d.profit+d.commission+d.swap+d.fee) net FROM deals d JOIN accounts a ON a.id=d.account_id WHERE d.side IN ('buy','sell') AND d.time>=? GROUP BY a.id,a.currency,day ORDER BY day",[time()-30*86400]);
    $botStats=rows("SELECT d.account_id,COUNT(CASE WHEN d.entry IN ('in','inout') THEN 1 END) entries,SUM(d.profit+d.commission+d.swap+d.fee) net FROM deals d JOIN bots b ON b.account_id=d.account_id WHERE d.magic='610001' AND d.time>=b.started_at AND d.side IN ('buy','sell') GROUP BY d.account_id");
    json_response(['accounts'=>$accounts,'stats'=>$stats,'account_stats'=>$accountStats,'period_stats'=>$periodStats,'account_period_stats'=>$accountPeriodStats,'chart'=>$chart,'account_chart'=>$accountChart,'bot_stats'=>$botStats,'commands'=>rows('SELECT c.*,a.name account FROM commands c JOIN accounts a ON a.id=c.account_id ORDER BY c.id DESC LIMIT 100'),'pairings'=>rows("SELECT id,label,symbol,status,account_id,created_at,expires_at,claimed_at FROM pairings WHERE created_at>=? ORDER BY id DESC LIMIT 10",[time()-86400]),'audit'=>rows('SELECT * FROM audit ORDER BY id DESC LIMIT 15'),'server_time'=>time()]);
}
if($method==='GET' && $path==='/api/journal') {
    $page=max(1,min(100000,(int)($_GET['page']??1))); $filter="d.side IN ('buy','sell')"; $args=[];
    if(!empty($_GET['account'])) {$filter.=' AND d.account_id=?'; $args[]=(int)$_GET['account'];}
    if(!empty($_GET['search'])) {$filter.=' AND (d.symbol LIKE ? OR d.ticket LIKE ?)'; $s='%'.substr((string)$_GET['search'],0,40).'%'; $args[]=$s;$args[]=$s;}
    $count=one("SELECT COUNT(*) total FROM deals d WHERE $filter",$args)['total'];
    $data=rows("SELECT d.*,a.name account,a.currency,COALESCE(n.note,'') note FROM deals d JOIN accounts a ON a.id=d.account_id LEFT JOIN journal_notes n ON n.account_id=d.account_id AND n.ticket=d.ticket WHERE $filter ORDER BY d.time DESC,d.ticket DESC LIMIT 50 OFFSET ".(($page-1)*50),$args);
    json_response(['deals'=>$data,'total'=>$count,'page'=>$page]);
}
if($method==='POST' && preg_match('#^/api/journal/(\d+)/(\d+)/note$#',$path,$m)) {
    $b=body(); $note=$b['note']??null;
    if(!is_string($note)||strlen($note)>4000) fail('Journal note must be text up to 4000 characters');
    $account=(int)$m[1]; $ticket=$m[2];
    if(!one('SELECT 1 FROM deals WHERE account_id=? AND ticket=?',[$account,$ticket])) fail('Deal not found',404);
    if(trim($note)==='') query('DELETE FROM journal_notes WHERE account_id=? AND ticket=?',[$account,$ticket]);
    else query('INSERT INTO journal_notes(account_id,ticket,note,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,ticket) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at',[$account,$ticket,trim($note),time()]);
    json_response(['ok'=>true,'note'=>trim($note)]);
}
if($method==='POST' && $path==='/api/accounts') {
    $b=body();
    $label=trim((string)($b['name']??$b['label']??'')); if($label!==''&&(strlen($label)>60||preg_match('/[\x00-\x1F\x7F]/',$label))) fail('Invalid account label');
    $symbol=trim((string)($b['symbol']??'XAGUSD')); if($symbol===''||strlen($symbol)>40||preg_match('/[\x00-\x1F\x7F]/',$symbol)) fail('Invalid symbol');
    do {$code=normalize_pairing_code(pairing_code());} while(one('SELECT id FROM pairings WHERE code_hash=?',[hash('sha256',$code)]));
    $id=transaction(function()use($label,$symbol,$code){
        query('INSERT INTO pairings(code_hash,label,symbol,created_at,expires_at) VALUES(?,?,?,?,?)',[$code===''?'':hash('sha256',$code),$label,$symbol,time(),time()+900]);
        $id=(int)db()->lastInsertId(); audit('pairing.created',['id'=>$id,'label'=>$label]); return $id;
    });
    json_response(['id'=>$id,'code'=>substr($code,0,4).'-'.substr($code,4),'expires_at'=>time()+900,'symbol'=>$symbol],201);
}
if($method==='POST' && preg_match('#^/api/accounts/(\d+)/(rotate|revoke)$#',$path,$m)) {
    $id=(int)$m[1];if(!one('SELECT id FROM accounts WHERE id=?',[$id])) fail('Account not found',404);
    $token=bin2hex(random_bytes(32));
    transaction(function()use($id,$m,$token){
        query('UPDATE accounts SET token_hash=?,enabled=? WHERE id=?',[hash('sha256',$token),$m[2]==='rotate'?1:0,$id]);
        query("UPDATE bots SET desired='stopped',version=version+1,updated_at=? WHERE account_id=?",[time(),$id]);
        query("UPDATE commands SET status='cancelled',message='Account credential changed',updated_at=? WHERE account_id=? AND status='queued'",[time(),$id]);audit('account.'.$m[2],['id'=>$id]);
    });json_response(['ok'=>true,'token'=>$m[2]==='rotate'?$token:null]);
}
if($method==='POST' && $path==='/api/orders') {
    $b=body();$key=strval_input($b,'request_key',100);$type=strval_input($b,'type',20);
    if(!in_array($type,['buy_limit','buy_stop','sell_limit','sell_stop'],true)) fail('Unsupported order type');
    $p=['type'=>$type,'lots'=>number($b,'lots',0.001,100),'entry'=>number($b,'entry',0.000001,1e9),'sl'=>number($b,'sl',0.000001,1e9),'tp'=>number($b,'tp',0.000001,1e9)];
    $buy=str_starts_with($type,'buy');
    if($buy? !($p['sl']<$p['entry']&&$p['tp']>$p['entry']): !($p['sl']>$p['entry']&&$p['tp']<$p['entry'])) fail('Buy: SL < entry < TP. Sell: TP < entry < SL.');
    $ttl=integer($b,'ttl',10,3600);$ids=$b['accounts']??[];
    if(!is_array($ids)||!count($ids)||count($ids)>100) fail('Select 1–100 accounts');
    foreach($ids as $id) if(!is_int($id)||$id<1) fail('Invalid account selection');
    $ids=array_values(array_unique($ids));sort($ids);$hash=hash('sha256',json_encode([$p,$ids,$ttl]));
    $result=transaction(function()use($key,$hash,$p,$ids,$ttl){
        $old=one('SELECT * FROM intents WHERE request_key=?',[$key]);if($old){if(!hash_equals($old['payload_hash'],$hash)) fail('Idempotency key reused with different data',409);return ['id'=>$old['id'],'duplicate'=>true];}
        $targets=[];foreach($ids as $id){$a=one('SELECT * FROM accounts WHERE id=? AND enabled=1',[$id]);if(!$a) fail('A selected account is disabled or missing');$targets[]=$a;}
        query('INSERT INTO intents(request_key,payload_hash,payload,created_at) VALUES(?,?,?,?)',[$key,$hash,json_encode($p),time()]);$intent=(int)db()->lastInsertId();
        foreach($targets as $a) query('INSERT INTO commands(intent_id,account_id,payload,created_at,expires_at,updated_at) VALUES(?,?,?,?,?,?)',[$intent,$a['id'],json_encode($p+['symbol'=>$a['symbol']]),time(),time()+$ttl,time()]);
        audit('orders.distributed',['intent'=>$intent,'accounts'=>$ids]);return ['id'=>$intent,'targets'=>count($ids)];
    });json_response($result,201);
}
if($method==='POST' && preg_match('#^/api/bots/(\d+)$#',$path,$m)) {
    $id=(int)$m[1];$a=one('SELECT * FROM accounts WHERE id=? AND enabled=1',[$id]);if(!$a) fail('Enabled account not found',404);
    $b=body();$desired=strval_input($b,'desired',10);if(!in_array($desired,['running','stopped'],true)) fail('Invalid desired state');
    $cfg=[];$expires=0;
    if($desired==='running') {
        if(!$a['last_seen']||time()-(int)$a['last_seen']>=15||!$a['trade_allowed']) fail('Connect the EA and enable trading before starting');
        $cfg=['lots'=>number($b,'lots',0.001,100),'max_positions'=>integer($b,'max_positions',1,20),'max_volume'=>number($b,'max_volume',0.001,100),
        'spread'=>integer($b,'spread',1,10000),'daily_loss'=>number($b,'daily_loss',0.01,1e7),'cooldown'=>integer($b,'cooldown',60,86400),'atr_sl'=>number($b,'atr_sl',0.5,10),'atr_tp'=>number($b,'atr_tp',0.5,20),
        'entry_min'=>number($b,'entry_min',0,1e9),'entry_max'=>number($b,'entry_max',0,1e9)];
        if($cfg['lots']>$cfg['max_volume']) fail('Lot size exceeds maximum volume');
        if($cfg['entry_max']>0&&$cfg['entry_min']>$cfg['entry_max']) fail('Entry range is reversed');
        $expires=time()+integer($b,'duration',1,24)*3600;
    }
    transaction(function()use($id,$desired,$cfg,$expires){
        if($desired==='running') query('UPDATE bots SET desired=?,version=version+1,config=?,run_id=?,started_at=?,expires_at=?,updated_at=? WHERE account_id=?',[$desired,json_encode($cfg),bin2hex(random_bytes(8)),time(),$expires,time(),$id]);
        else query("UPDATE bots SET desired='stopped',version=version+1,updated_at=? WHERE account_id=?",[time(),$id]);
        audit('bot.'.$desired,['account'=>$id,'config'=>$cfg]);
    });json_response(['ok'=>true]);
}
if($method==='POST' && $path==='/api/stop') {
    transaction(function(){query("UPDATE bots SET desired='stopped',version=version+1,updated_at=?",[time()]);query("UPDATE commands SET status='cancelled',message='Stopped before delivery',updated_at=? WHERE status='queued'",[time()]);audit('system.stop');});
    json_response(['ok'=>true]);
}
fail('Endpoint not found',404);
