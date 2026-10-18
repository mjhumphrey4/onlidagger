<?php
declare(strict_types=1);
date_default_timezone_set('UTC');
function db(): PDO {
    static $db;
    if ($db) return $db;
    $path = getenv('DB_PATH') ?: dirname(__DIR__).'/storage/onlidagger.sqlite';
    if (!is_dir(dirname($path))) mkdir(dirname($path), 0700, true);
    $db = new PDO('sqlite:'.$path, null, null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
    $db->exec(file_get_contents(__DIR__.'/schema.sql'));
    @chmod($path, 0600);
    return $db;
}
function query(string $sql, array $args=[]): PDOStatement { $s=db()->prepare($sql); $s->execute($args); return $s; }
function rows(string $sql, array $args=[]): array { return query($sql,$args)->fetchAll(); }
function one(string $sql, array $args=[]): array|false { return query($sql,$args)->fetch(); }
function json_response(mixed $data, int $status=200): never {
    http_response_code($status); header('Content-Type: application/json');
    echo json_encode($data, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES); exit;
}
function fail(string $message, int $status=422): never { json_response(['error'=>$message], $status); }
function body(): array {
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>1048576) fail('Request too large',413);
    $raw=file_get_contents('php://input',false,null,0,1048577);
    if(strlen($raw)>1048576) fail('Request too large',413);
    if(str_contains($_SERVER['CONTENT_TYPE']??'', 'application/json')) {
        try { $b=json_decode($raw,true,64,JSON_THROW_ON_ERROR); } catch (JsonException) { fail('Invalid JSON'); }
        if(!is_array($b) || !str_starts_with(ltrim($raw),'{')) fail('Expected a JSON object');
        return $b;
    }
    parse_str($raw,$b); return $b;
}
function strval_input(array $b,string $key,int $max=100): string {
    $v=$b[$key]??'';
    if(!is_string($v) || trim($v)==='' || strlen($v)>$max || preg_match('/[\x00-\x1F\x7F]/',$v)) fail('Invalid '.$key);
    return trim($v);
}
function optional_string(array $b,string $key,int $max=100,string $default=''): string {
    $v=$b[$key]??$default;
    if($v===null) return $default;
    if(!is_string($v) || strlen($v)>$max || preg_match('/[\x00-\x1F\x7F]/',$v)) fail('Invalid '.$key);
    return trim($v);
}
function number(array $b,string $key,float $min,float $max): float {
    $v=$b[$key]??null;
    if(!is_numeric($v) || !is_finite((float)$v) || (float)$v<$min || (float)$v>$max) fail("$key must be between $min and $max");
    return (float)$v;
}
function integer(array $b,string $key,int $min,int $max): int {
    $v=number($b,$key,$min,$max); if(floor($v)!=$v) fail('Invalid integer '.$key); return (int)$v;
}
function audit(string $event,array $detail=[]): void { query('INSERT INTO audit(event,detail,created_at) VALUES(?,?,?)',[$event,json_encode($detail),time()]); }
function transaction(callable $work): mixed {
    db()->exec('BEGIN IMMEDIATE');
    try { $result=$work(); db()->exec('COMMIT'); return $result; }
    catch(Throwable $e) { db()->exec('ROLLBACK'); throw $e; }
}
function maintenance(): void {
    $now=time();
    query("UPDATE pairings SET status='expired' WHERE status='pending' AND expires_at<?",[$now]);
    query("UPDATE commands SET status='expired',message='Delivery deadline passed',updated_at=? WHERE status='queued' AND expires_at<?",[$now,$now]);
    query("UPDATE bots SET desired='stopped',version=version+1,updated_at=? WHERE desired='running' AND expires_at<=?",[$now,$now]);
}
function start_session(): void {
    session_set_cookie_params(['httponly'=>true,'samesite'=>'Strict','secure'=>(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off')]);
    session_start(); $_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function ea_account(array $b): array {
    $auth=$_SERVER['HTTP_AUTHORIZATION']??'';
    if(!str_starts_with($auth,'Bearer ')) fail('EA credential required',401);
    $a=one('SELECT * FROM accounts WHERE token_hash=? AND enabled=1',[hash('sha256',substr($auth,7))]);
    if(!$a || !hash_equals($a['login'],(string)($b['login']??'')) || !hash_equals($a['server'],(string)($b['server']??''))) fail('Invalid EA credential or account identity',401);
    return $a;
}
function pairing_code(): string {
    $alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code='';
    for($i=0;$i<8;$i++) $code.=$alphabet[random_int(0,strlen($alphabet)-1)];
    return substr($code,0,4).'-'.substr($code,4);
}
function normalize_pairing_code(string $code): string {
    $code=strtoupper(str_replace([' ','-'],'',$code));
    if(!preg_match('/^[A-Z2-9]{8}$/',$code)) fail('Invalid pairing code');
    return $code;
}
