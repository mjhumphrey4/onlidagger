'use strict';
const {useEffect,useMemo,useState} = React;
const h = React.createElement;
const csrf = document.querySelector('meta[name="csrf-token"]').content;
const views = {
  overview:['Command center','Trade the plan, not the noise. A live command center for every MT5 terminal.'],
  accounts:['Linked accounts','Pair terminals from MT5 without typing broker logins into the dashboard.'],
  copier:['Trade copier','Place pending orders once and let active terminals execute independently.'],
  journal:['Trade journal','Broker deals, costs and realized P/L imported by the EA.'],
  bot:['Silver bot','XAGUSD M1 controls for the accounts that are online and ready.']
};
const emptyState = {accounts:[],stats:[],account_stats:[],period_stats:[],account_period_stats:[],commands:[],chart:[],account_chart:[],audit:[],bot_stats:[],pairings:[],server_time:Math.floor(Date.now()/1000)};
const fmt = (v,d=2) => Number(v || 0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const money = (v,c='USD') => `${c === 'USD' ? '$' : c + ' '}${fmt(v)}`;
const signClass = v => Number(v)<0?'negative':'positive';
const dt = v => v ? new Date(Number(v)*1000).toLocaleString() : 'Never connected';
const rel = v => {
  if(!v) return 'Awaiting EA';
  const s = Math.max(0, Math.floor(Date.now()/1000-Number(v)));
  return s<60 ? 'Just now' : s<3600 ? Math.floor(s/60)+'m ago' : dt(v);
};
async function api(path, data, method='POST') {
  const response = await fetch('/api'+path, {
    method:data===undefined?'GET':method,
    headers:data===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},
    body:data===undefined?undefined:JSON.stringify(data),
    credentials:'same-origin'
  });
  let result;
  try { result = await response.json(); } catch(e) { throw new Error('The server returned an invalid response.'); }
  if(!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
async function copyText(value) {
  if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
  const area=document.createElement('textarea'); area.value=value; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(area); }
}
function Badge({status}) {
  const quiet = ['offline','stopped','expired','cancelled'].includes(status);
  return h('span',{className:'status '+status},h('span',{className:'dot '+(quiet?'off':'')}),status.replaceAll('_',' '));
}
function Empty({title,detail,onLink}) {
  return h('div',{className:'empty'},h('strong',null,title),detail,onLink&&h(React.Fragment,null,h('br'),h('button',{className:'button secondary',onClick:onLink},'+ Link your first account')));
}
function Modal({children,onClose}) {
  return h('dialog',{open:true,onCancel:e=>{e.preventDefault();onClose();}},children);
}
function App() {
  const [state,setState] = useState(emptyState);
  const [view,setView] = useState(location.hash.slice(1) in views ? location.hash.slice(1) : 'overview');
  const [currency,setCurrency] = useState('USD');
  const [toast,setToast] = useState('');
  const [error,setError] = useState('');
  const [clock,setClock] = useState(new Date());
  const [link,setLink] = useState(false);
  const [pairing,setPairing] = useState(null);
  const [confirm,setConfirm] = useState(null);
  const [journal,setJournal] = useState({deals:[],total:0,page:1});
  const [journalQuery,setJournalQuery] = useState({page:1,account:'',search:''});
  const [orderKey,setOrderKey] = useState(null);
  const [mobile,setMobile] = useState(false);
  const [selectedAccount,setSelectedAccount] = useState('');
  const currencies = useMemo(()=> {
    const list = [...new Set(state.accounts.map(a=>a.currency).filter(Boolean))];
    return list.length ? list : ['USD'];
  },[state.accounts]);
  const say = message => { setToast(message); setTimeout(()=>setToast(''), 6500); };
  async function refresh() {
    try {
      const next = await api('/state');
      setState(next); setError('');
      const list = [...new Set(next.accounts.map(a=>a.currency).filter(Boolean))];
      if(list.length && !list.includes(currency)) setCurrency(list[0]);
      if(selectedAccount && !next.accounts.some(a=>String(a.id)===String(selectedAccount))) setSelectedAccount('');
      if(pairing && next.pairings.some(p=>p.id===pairing.id && p.status==='claimed')) say('Account paired. MT5 is finishing the first heartbeat.');
    } catch(e) { setError(e.message+' Displayed data may be stale.'); }
  }
  useEffect(()=>{ refresh(); const id=setInterval(()=>{ if(!document.hidden) refresh(); },4000); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ const id=setInterval(()=>setClock(new Date()),1000); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ location.hash=view; if(view==='journal') loadJournal(journalQuery); },[view]);
  async function loadJournal(query=journalQuery) {
    try {
      const result = await api(`/journal?page=${query.page}&account=${encodeURIComponent(query.account)}&search=${encodeURIComponent(query.search)}`);
      setJournal(result); setJournalQuery(query);
    } catch(e) { say(e.message); }
  }
  function ask(title,message,onYes) { setConfirm({title,message,onYes}); }
  const title = views[view][0], description = views[view][1];
  return h(React.Fragment,null,
    h('aside',{className:'sidebar '+(mobile?'open':'')},
      h('a',{className:'brand',href:'/'},h('span',{className:'brand-mark'},'OD'),h('span',null,'ONLI',h('span',{className:'brand-light'},'Dagger'),h('small',null,'MT5 MANAGER'))),
      h('div',{className:'workspace'},h('span',{className:'workspace-icon'},'O'),h('div',null,'Trading workspace',h('small',null,'No-login local desk')),h('span',{className:'chevron'},'v')),
      h('span',{className:'nav-caption'},'WORKSPACE'),
      h('nav',{'aria-label':'Main navigation'},Object.keys(views).map(v=>h('button',{key:v,className:'nav-item '+(view===v?'active':''),'data-view':v,onClick:()=>{setView(v);setMobile(false);}},h('span',null,{overview:'[]',accounts:'##',copier:'<>',journal:'=',bot:'*'}[v]),views[v][0],v==='accounts'&&h('b',{id:'account-count'},state.accounts.length),v==='bot'&&h('i',null,'M1')))),
      h('div',{className:'sidebar-bottom'},h('div',{className:'connection'},h('span',{className:'dot '+(error?'off':'')}),h('div',null,error?'Server unavailable':'Server connected')),h('p',null,'Pair fast.',h('br'), 'Trade with receipts.'),h('div',{className:'profile'},h('span',null,'OD'),h('div',null,'Trading desk',h('small',null,'Private dashboard'))))
    ),
    h('div',{className:'shell'},h('header',{className:'topbar'},
      h('button',{id:'mobile-menu','aria-label':'Toggle menu',onClick:()=>setMobile(!mobile)},'☰'),
      h('div',{className:'breadcrumb'},'Workspace ',h('span',null,'/'),h('strong',{id:'breadcrumb'},title)),
      h('div',{className:'topbar-right'},h('span',{className:'utc',id:'clock'},clock.toISOString().slice(11,19)+' UTC'),h('span',{className:'pill subtle'},'MT5 bridge'),h('button',{className:'icon-button',id:'refresh','aria-label':'Refresh data',onClick:refresh},'↻'))
    ),h('main',null,
      h('div',{className:'page-heading'},h('div',null,h('div',{className:'eyebrow'},'YOUR TRADING COMMAND CENTER'),h('h1',{id:'page-title'},title),h('p',{id:'page-description'},description)),h('button',{className:'button primary','data-action':'link',onClick:()=>setLink(true)},'+ Link account')),
      error&&h('div',{className:'notice',id:'error-banner'},error),
      view==='overview'&&h(Overview,{state,currency,setCurrency,currencies,selectedAccount,setSelectedAccount,onLink:()=>setLink(true)}),
      view==='accounts'&&h(Accounts,{state,onLink:()=>setLink(true),ask,refresh,say}),
      view==='copier'&&h(Copier,{state,ask,refresh,say,orderKey,setOrderKey}),
      view==='journal'&&h(Journal,{journal,query:journalQuery,loadJournal,setQuery:setJournalQuery,accounts:state.accounts}),
      view==='bot'&&h(Bot,{state,ask,refresh,say}),
      h('footer',null,h('span',null,'ONLIDagger ',h('b',null,'MT5 Manager')),h('span',null,'Broker-reported data'),h('button',{className:'text-button danger',onClick:()=>ask('Stop all new activity?','Stop every bot and cancel commands not delivered yet. Existing broker positions and accepted pending orders remain active.',async()=>{await api('/stop',{});say('Stop requested for all accounts.');refresh();})},'Stop all new activity'))
    )),
    link&&h(LinkDialog,{onClose:()=>setLink(false),onPaired:p=>{setPairing(p);setLink(false);refresh();}}),
    pairing&&h(PairingDialog,{pairing,state,onClose:()=>setPairing(null)}),
    confirm&&h(ConfirmDialog,{confirm,onClose:()=>setConfirm(null),say}),
    toast&&h('div',{id:'toast',role:'status'},toast)
  );
}
function Overview({state,currency,setCurrency,currencies,selectedAccount,setSelectedAccount,onLink}) {
  const selected = state.accounts.find(a=>String(a.id)===String(selectedAccount));
  const activeCurrency = selected ? (selected.currency || currency) : currency;
  const accounts = selected ? [selected] : state.accounts.filter(a=>a.currency===activeCurrency && a.last_seen);
  const stats = selected
    ? state.account_stats.find(s=>String(s.account_id)===String(selected.id))||{net:0,exits:0,wins:0}
    : state.stats.find(s=>s.currency===activeCurrency)||{net:0,exits:0,wins:0};
  const period = name => selected
    ? state.account_period_stats.find(s=>String(s.account_id)===String(selected.id) && s.period===name)||{net:0,deals:0,exits:0,wins:0}
    : state.period_stats.find(s=>s.currency===activeCurrency && s.period===name)||{net:0,deals:0,exits:0,wins:0};
  const sum = key => accounts.reduce((n,a)=>n+Number(a[key]||0),0);
  const scopedCommands = selected ? state.commands.filter(c=>String(c.account_id)===String(selected.id)) : state.commands;
  const cards = [
    [selected?'Account balance':'Total balance',accounts.length?money(sum('balance'),activeCurrency):'-',selected?`${selected.server} - ${selected.login}`:`${accounts.length} reporting account(s)`],
    [selected?'Account equity':'Total equity',accounts.length?money(sum('equity'),activeCurrency):'-','Balance plus open P/L'],
    ['All-time realized',accounts.length?money(stats.net,activeCurrency):'-',`${stats.exits||0} exit deals`],
    ['Win rate',stats.exits?fmt(stats.wins/stats.exits*100,1)+'%':'-',`${stats.wins||0} winning exits`]
  ];
  return h('section',{className:'view',id:'view-overview'},
    h('div',{className:'section-toolbar dashboard-toolbar'},
      h('span',{className:'live-label'},h('span',{className:'dot'}),' Live workspace ',h('span',{className:'muted',id:'updated'},'Updated just now')),
      h('div',{className:'toolbar-controls'},
        h('label',{className:'account-control'},'Account view ',h('select',{value:selectedAccount,onChange:e=>setSelectedAccount(e.target.value)},h('option',{value:''},'All reporting accounts'),state.accounts.map(a=>h('option',{key:a.id,value:a.id},`${a.name} - ${a.currency||'offline'}`)))),
        !selected&&h('label',{className:'currency-control'},'Currency ',h('select',{id:'currency',value:currency,onChange:e=>setCurrency(e.target.value)},currencies.map(c=>h('option',{key:c},c))))
      )
    ),
    selected&&h('div',{className:'account-spotlight'},
      h('div',null,h('span',{className:'account-avatar large'},selected.name.slice(0,1).toUpperCase()),h('div',null,h('strong',null,selected.name),h('small',null,selected.server+' - '+selected.login))),
      h('div',null,h(Badge,{status:selected.online?'online':'offline'}),h('span',{className:'muted'},' Last heartbeat '+rel(selected.last_seen))),
      h('div',null,h('span',null,'Symbol'),h('b',null,selected.symbol)),
      h('div',null,h('span',null,'Mode'),h('b',null,selected.mode))
    ),
    h('div',{className:'metrics',id:'metrics'},cards.map(c=>h('div',{className:'metric',key:c[0]},h('div',{className:'metric-name'},c[0],h('span',{className:'metric-icon'},'▣')),h('div',{className:'metric-value '+signClass(c[1])},c[1]),h('div',{className:'metric-note'},c[2])))),
    h('div',{className:'metrics period-metrics'},['today','week','month'].map(p=>{const s=period(p);return h('div',{className:'metric',key:p},h('div',{className:'metric-name'},p==='today'?'Today':p==='week'?'Last 7 days':'This month'),h('div',{className:'metric-value '+signClass(s.net)},money(s.net,activeCurrency)),h('div',{className:'metric-note'},`${s.deals||0} trading deal(s)`));})),
    h('div',{className:'overview-grid'},h('article',{className:'panel performance'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,selected?'Account performance':'Realized performance'),h('p',null,'Cumulative net P/L - last 30 days - UTC')),h('span',{className:'pill'},'30 days')),h('div',{className:'chart-value',id:'chart-total'},money((selected?state.account_chart.filter(d=>String(d.account_id)===String(selected.id)):state.chart.filter(d=>d.currency===activeCurrency)).reduce((n,d)=>n+Number(d.net),0),activeCurrency)),h(Chart,{state,currency:activeCurrency,accountId:selected&&selected.id})),
      h('article',{className:'panel silver-card'},h('div',{className:'silver-top'},h('span',{className:'silver-icon'},'*'),h('span',{className:'pill green'},'XAGUSD - M1')),h('div',{className:'eyebrow'},'ACTIVE TERMINAL ROUTING'),h('h2',null,'Bot control follows the terminal.'),h('p',null,'Start it on an account that is online. The EA running there receives the config and reports back.'),h('div',{className:'bot-mini'},h('span',null,h('span',{className:'dot'}),' ',h('b',null,state.accounts.filter(a=>a.desired==='running'&&a.online).length),' active accounts'),h('span',null,'EMA - RSI - ATR')))),
    h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'Your accounts ',h('span',{className:'count',id:'overview-account-count'},state.accounts.length)),h('p',null,'Balances and connectivity directly from terminals'))),h(AccountTable,{accounts:state.accounts,onLink})),
    h('div',{className:'bottom-grid'},h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,selected?'Recent account executions':'Recent executions'),h('p',null,selected?'Only commands for the selected account':'Each account, each result'))),h(CommandTable,{commands:scopedCommands.slice(0,4),compact:true})),h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'Pairing requests'),h('p',null,'Recent account connection codes'))),h(PairingList,{pairings:state.pairings})))
  );
}
function Chart({state,currency,accountId}) {
  const data = accountId ? state.account_chart.filter(d=>String(d.account_id)===String(accountId)) : state.chart.filter(d=>d.currency===currency);
  if(!data.length) return h('div',{className:'chart',id:'chart'},h('div',{className:'chart-empty'},h('strong',null,'Make room for your performance.'),'Your chart begins with the first imported trade.'));
  let net=0;
  const points=[];
  for(let i=29;i>=0;i--){const day=new Date((state.server_time-i*86400)*1000).toISOString().slice(0,10);net+=Number((data.find(d=>d.day===day)||{}).net||0);points.push({day,net});}
  const values=[0,...points.map(p=>p.net)], low=Math.min(...values), high=Math.max(...values), min=low===high?low-1:low, max=low===high?high+1:high, range=max-min;
  const xy=points.map((p,i)=>[50+i*540/29,150-(p.net-min)*125/range]);
  const line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  return h('div',{className:'chart',id:'chart'},h('svg',{viewBox:'0 0 610 185',role:'img','aria-label':'Cumulative realized profit and loss over the last 30 days'},
    h('path',{d:line+' L590,150 L50,150 Z',fill:'#dceafe'}),h('path',{d:line,fill:'none',stroke:'#2563eb',strokeWidth:'2'}),
    [0,7,14,21,29].map(i=>h('text',{key:i,x:xy[i][0],y:176,textAnchor:'middle'},points[i].day.slice(5)))
  ));
}
function AccountTable({accounts,onLink}) {
  if(!accounts.length) return h(Empty,{title:'Your workspace starts here',detail:'Create a pairing code and claim it from MT5.',onLink});
  return h('div',{className:'table-wrap',id:'overview-accounts'},h('table',null,h('thead',null,h('tr',null,['Account','Status','Balance','Equity','Floating P/L','Environment'].map(x=>h('th',{key:x},x)))),h('tbody',null,accounts.slice(0,6).map(a=>h('tr',{key:a.id},h('td',null,h('div',{className:'account-cell'},h('span',{className:'account-avatar'},a.name.slice(0,1).toUpperCase()),h('div',null,h('strong',null,a.name),h('small',null,a.server+' - '+a.login)))),h('td',null,h(Badge,{status:a.online?'online':'offline'})),h('td',null,a.last_seen?money(a.balance,a.currency):'-'),h('td',null,a.last_seen?money(a.equity,a.currency):'-'),h('td',{className:signClass(a.floating)},a.last_seen?money(a.floating,a.currency):'-'),h('td',null,a.mode))))));
}
function Accounts({state,onLink,ask,refresh,say}) {
  return h('section',{className:'view',id:'view-accounts'},
    h('div',{className:'info-banner'},'Click Link account, paste the code into the ONLIDagger EA, and MT5 will identify its own login/server during pairing.'),
    h('div',{className:'account-grid',id:'account-cards'},state.accounts.length?state.accounts.map(a=>h('article',{className:'account-card',key:a.id},h('div',{className:'account-card-header'},h('h3',null,a.name),h(Badge,{status:a.online?'online':'offline'})),h('p',null,a.login+' - '+a.server),h('div',{className:'account-balance'},a.last_seen?money(a.balance,a.currency):'Awaiting EA'),h('div',{className:'account-details'},['equity','floating','symbol','mode','trade_allowed','last_seen'].map(k=>h('span',{key:k},k.replace('_',' '),h('b',{className:k==='floating'?signClass(a.floating):''},k==='equity'?(a.last_seen?money(a.equity,a.currency):'-'):k==='floating'?(a.last_seen?money(a.floating,a.currency):'-'):k==='trade_allowed'?(a.trade_allowed?'Enabled':'Disabled'):k==='last_seen'?rel(a.last_seen):String(a[k]))))),a.positions.length?h('div',{className:'position-list'},a.positions.slice(0,5).map(p=>`${p.symbol} - ${p.side} - ${fmt(p.volume,3)} lots - ${money(p.profit,a.currency)}`).join('\n')):null,h('div',{className:'card-actions'},h('button',{className:'text-button',onClick:onLink},'Create new pairing code'),a.enabled&&h('button',{className:'text-button danger',onClick:()=>ask('Revoke this account?','The EA API token stops working and the bot is stopped.',async()=>{await api(`/accounts/${a.id}/revoke`,{});say('Account revoked.');refresh();})},'Revoke access')))):h(Empty,{title:'Connect your first terminal',detail:'No broker login is needed in the dashboard.',onLink})),
    h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'Recent pairings'),h('p',null,'Pending codes expire after 15 minutes.'))),h(PairingList,{pairings:state.pairings}))
  );
}
function Copier({state,ask,refresh,say,orderKey,setOrderKey}) {
  const [form,setForm] = useState({type:'sell_limit',lots:'0.01',entry:'',sl:'',tp:'',ttl:'60',accounts:[]});
  const enabled = state.accounts.filter(a=>a.enabled);
  const toggle = id => setForm(f=>({...f,accounts:f.accounts.includes(id)?f.accounts.filter(x=>x!==id):[...f.accounts,id]}));
  async function submit(e) {
    e.preventDefault();
    const payload={type:form.type,lots:Number(form.lots),entry:Number(form.entry),sl:Number(form.sl),tp:Number(form.tp),ttl:Number(form.ttl),accounts:form.accounts.slice().sort((a,b)=>a-b)};
    if(!payload.accounts.length){ say('Select at least one target account.'); return; }
    ask('Place pending orders?',`${payload.type.replaceAll('_',' ')} on ${payload.accounts.length} account(s).`,async()=>{
      const key = orderKey || crypto.getRandomValues(new Uint8Array(16)).reduce((s,b)=>s+b.toString(16).padStart(2,'0'),'');
      setOrderKey(key);
      const result=await api('/orders',{...payload,request_key:key});
      setOrderKey(null); say(`Order intent #${result.id} saved.`); refresh();
    });
  }
  return h('section',{className:'view',id:'view-copier'},h('div',{className:'two-column'},h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'One placement. Every selected account.'),h('p',null,'The active EA on each account validates broker rules before submitting.')),h('span',{className:'pill green'},'TRADE COPIER')),h('form',{id:'order-form',className:'form-body',onSubmit:submit},h('div',{className:'field-grid'},[
    ['Order type',h('select',{name:'type',value:form.type,onChange:e=>setForm({...form,type:e.target.value})},['buy_limit','buy_stop','sell_limit','sell_stop'].map(x=>h('option',{key:x,value:x},x.replaceAll('_',' '))))],
    ['Lots per account',h('input',{name:'lots',type:'number',min:'0.001',step:'0.001',value:form.lots,onChange:e=>setForm({...form,lots:e.target.value}),required:true})],
    ['Entry price',h('input',{name:'entry',type:'number',step:'any',value:form.entry,onChange:e=>setForm({...form,entry:e.target.value}),required:true})],
    ['Delivery deadline',h('select',{name:'ttl',value:form.ttl,onChange:e=>setForm({...form,ttl:e.target.value})},[['60','60 seconds'],['300','5 minutes'],['900','15 minutes']].map(o=>h('option',{key:o[0],value:o[0]},o[1])))],
    ['Stop loss',h('input',{name:'sl',type:'number',step:'any',value:form.sl,onChange:e=>setForm({...form,sl:e.target.value}),required:true})],
    ['Take profit',h('input',{name:'tp',type:'number',step:'any',value:form.tp,onChange:e=>setForm({...form,tp:e.target.value}),required:true})]
  ].map(x=>h('label',{key:x[0]},x[0],x[1]))),h('div',{className:'form-section-title'},'Target accounts ',h('span',null,'Fixed lots on each account')),h('div',{id:'order-targets'},enabled.length?enabled.map(a=>h('label',{className:'target',key:a.id},h('input',{type:'checkbox',name:'targets',checked:form.accounts.includes(a.id),onChange:()=>toggle(a.id)}),h('span',null,a.name,h('small',{className:'muted'},' - '+a.symbol)),h(Badge,{status:a.online?'online':'offline'}))):h(Empty,{title:'No linked accounts',detail:'Link an account to place orders.'})),h('p',{className:'form-note'},'The deadline limits delivery. Accepted pending orders remain at the broker.'),h('button',{className:'button primary full',type:'submit'},'Review and place orders'))),h('article',{className:'panel guide'},h('span',{className:'guide-icon'},'<>'),h('h2',null,'Each terminal executes for itself.'),h('p',null,'The copier fans out commands to accounts; the EA checks quote freshness, tick grid, volume and margin locally.'))),h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'Execution ledger'),h('p',null,'Latest 100 account commands'))),h(CommandTable,{commands:state.commands})));
}
function CommandTable({commands,compact=false}) {
  if(!commands.length) return h(Empty,{title:'No orders placed yet',detail:'New placements and EA execution reports appear here.'});
  return h('div',{className:'table-wrap',id:compact?'recent-commands':'command-table'},h('table',null,h('thead',null,h('tr',null,['Account / order','Status',!compact&&'Levels',!compact&&'Broker ticket',!compact&&'Broker response','Updated'].filter(Boolean).map(x=>h('th',{key:x},x)))),h('tbody',null,commands.map(c=>{const p=JSON.parse(c.payload);return h('tr',{key:c.id},h('td',null,h('div',{className:'account-cell'},h('div',null,h('strong',null,c.account),h('small',null,`#${c.id} - ${p.type.replaceAll('_',' ')} - ${p.symbol} - ${fmt(p.lots,3)} lots`)))),h('td',null,h(Badge,{status:c.status})),!compact&&h('td',null,fmt(p.entry,3),h('small',{className:'muted'},` SL ${fmt(p.sl,3)} - TP ${fmt(p.tp,3)}`)),!compact&&h('td',null,h('code',null,c.ticket||'-')), !compact&&h('td',{className:'ledger-message'},c.message||'Awaiting EA',c.retcode&&h('br'),c.retcode&&('Code '+c.retcode)),h('td',{className:'muted'},rel(c.updated_at)));}))));
}
function Journal({journal,query,loadJournal,setQuery,accounts}) {
  const update = patch => { const q={...query,...patch,page:patch.page||1}; setQuery(q); loadJournal(q); };
  const csv = () => {
    const keys=['ticket','account','time','symbol','side','entry','volume','price','profit','commission','swap','fee','currency'];
    const cell=v=>'"'+String(v==null?'':v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    const blob=new Blob([[keys.join(','),...journal.deals.map(d=>keys.map(k=>cell(d[k])).join(','))].join('\r\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`onlidagger-journal-page-${journal.page}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  return h('section',{className:'view',id:'view-journal'},h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('span',{className:'section-kicker'},'LEDGER'),h('h2',null,'Trade journal'),h('p',null,'Broker deals, costs and realized performance.')),h('button',{className:'button secondary',id:'export',onClick:csv},'Export CSV')),h('div',{className:'journal-filters'},h('input',{id:'journal-search',type:'search',placeholder:'Search symbol or ticket...',value:query.search,onChange:e=>update({search:e.target.value})}),h('select',{id:'journal-account',value:query.account,onChange:e=>update({account:e.target.value})},h('option',{value:''},'All accounts'),accounts.map(a=>h('option',{key:a.id,value:a.id},a.name))),h('span',{className:'muted',id:'journal-total'},journal.total+' deals')),h('div',{id:'journal-table'},journal.deals.length?h('div',{className:'table-wrap'},h('table',null,h('thead',null,h('tr',null,['Time / ticket','Account','Symbol / side','Entry','Lots','Price','Costs','Net P/L'].map(x=>h('th',{key:x},x)))),h('tbody',null,journal.deals.map(d=>{const net=Number(d.profit)+Number(d.commission)+Number(d.swap)+Number(d.fee);return h('tr',{key:d.ticket},h('td',null,dt(d.time),h('br'),h('code',{className:'muted'},d.ticket)),h('td',null,d.account),h('td',null,d.symbol,' ',h('span',{className:d.side==='sell'?'negative':'positive'},d.side)),h('td',null,d.entry),h('td',null,fmt(d.volume,3)),h('td',null,fmt(d.price,3)),h('td',null,money(Number(d.commission)+Number(d.swap)+Number(d.fee),d.currency)),h('td',{className:signClass(net)},money(net,d.currency)));})))):h(Empty,{title:'No matching trades',detail:'The EA imports broker history automatically while connected.'})),h('div',{className:'pagination'},h('button',{className:'button secondary',id:'prev-page',disabled:journal.page<=1,onClick:()=>loadJournal({...query,page:journal.page-1})},'Previous'),h('span',{id:'page-number'},`Page ${journal.page} of ${Math.max(1,Math.ceil(journal.total/50))}`),h('button',{className:'button secondary',id:'next-page',disabled:journal.page*50>=journal.total,onClick:()=>loadJournal({...query,page:journal.page+1})},'Next'))));
}
function Bot({state,ask,refresh,say}) {
  const [form,setForm] = useState({account:'',lots:'0.01',max_positions:'1',max_volume:'0.05',spread:'50',daily_loss:'50',cooldown:'120',atr_sl:'1.5',atr_tp:'2',entry_min:'0',entry_max:'0',duration:'1'});
  async function submit(e) {
    e.preventDefault(); if(!form.account){say('Select a target account.');return;}
    const account=state.accounts.find(a=>a.id===Number(form.account));
    ask('Start Silver bot?',`Start sell-only M1 entries on ${account.name}.`,async()=>{const payload={desired:'running'};Object.entries(form).forEach(([k,v])=>{if(k!=='account')payload[k]=Number(v);});await api('/bots/'+form.account,payload);say('Start requested. Watch the EA acknowledgement below.');refresh();});
  }
  return h('section',{className:'view',id:'view-bot'},h('div',{className:'bot-intro'},h('span',{className:'silver-icon'},'*'),h('div',null,h('span',{className:'eyebrow'},'SILVER SPECIALIST'),h('h2',null,'XAGUSD. One minute. Account-routed.'),h('p',null,'The selected account receives the run configuration through its active EA. Validate on demo before live use.')),h('span',{className:'pill'},'STRATEGY v1.0')),h('div',{className:'two-column'},h('article',{className:'panel'},h('div',{className:'panel-heading'},h('div',null,h('h2',null,'Configure a bot run'),h('p',null,'Only online accounts with trading permission can start.'))),h('form',{id:'bot-form',className:'form-body',onSubmit:submit},h('label',null,'Target account',h('select',{name:'account',id:'bot-account',required:true,value:form.account,onChange:e=>setForm({...form,account:e.target.value})},h('option',{value:''},'Select an account'),state.accounts.filter(a=>a.enabled).map(a=>h('option',{key:a.id,value:a.id},`${a.name} - ${a.mode}${a.online?'':' - offline'}`)))),h('div',{className:'field-grid'},[
    ['lots','Lots per entry'],['max_positions','Maximum positions'],['max_volume','Maximum total silver lots'],['spread','Maximum spread (points)'],['daily_loss','Daily loss limit'],['cooldown','Entry cooldown (seconds)'],['atr_sl','Stop loss x ATR(14)'],['atr_tp','Take profit x ATR(14)'],['entry_min','Minimum entry price'],['entry_max','Maximum entry price']
  ].map(([key,label])=>h('label',{key},label,h('input',{name:key,type:'number',step:key.includes('atr')?'0.1':'any',value:form[key],onChange:e=>setForm({...form,[key]:e.target.value}),required:true}))),h('label',null,'Run duration',h('select',{name:'duration',value:form.duration,onChange:e=>setForm({...form,duration:e.target.value})},['1','4','8','24'].map(x=>h('option',{key:x,value:x},x+' hour'+(x==='1'?'':'s')))))),h('p',{className:'form-note'},'Loss limits stop new entries. They do not guarantee a maximum loss.'),h('button',{className:'button primary full',type:'submit'},'Start bot on selected account'))),h('article',{className:'panel guide strategy'},h('span',{className:'guide-icon'},'*'),h('h2',null,'The entry checklist'),h('ol',null,['EMA(9) below EMA(21)','Bearish pullback rejection below EMA(9)','RSI(14) between 25 and 50','Spread, exposure, cooldown and daily P/L gates clear'].map(x=>h('li',{key:x},h('b',null,x)))))),
    h('div',{id:'bot-runs',className:'account-grid'},state.accounts.map(a=>{const stats=state.bot_stats.find(s=>s.account_id===a.id)||{entries:0,net:0};const applied=a.bot_applied===a.version;return h('article',{className:'account-card',key:a.id},h('div',{className:'account-card-header'},h('h3',null,a.name),h(Badge,{status:!a.online?'offline':!applied?'delivered':a.desired})),h('p',null,`Requested: ${a.desired} - Version ${a.version}${applied?' - Applied by EA':' - Awaiting EA acknowledgement'}`),h('div',{className:'run-message'},a.bot_message),h('div',{className:'run-stats'},h('span',null,'Entry deals this run',h('b',null,stats.entries||0)),h('span',null,'Realized net P/L',h('b',{className:signClass(stats.net)},a.currency?money(stats.net,a.currency):'-'))),h('p',null,a.started_at?'Run started '+dt(a.started_at):'No run started',a.desired==='running'&&h(React.Fragment,null,h('br'),'Expires '+dt(a.expires_at))),a.desired==='running'&&h('button',{className:'button secondary full','data-account-action':'stop',onClick:()=>ask('Stop bot entries?','Existing positions keep their broker-side exits.',async()=>{await api(`/bots/${a.id}`,{desired:'stopped'});say('Stop requested.');refresh();})},'Stop new entries'));})));
}
function PairingList({pairings}) {
  if(!pairings.length) return h(Empty,{title:'No recent pairing codes',detail:'Create a code when you are ready to attach the EA.'});
  return h('div',{className:'table-wrap'},
    h('table',null,
      h('thead',null,h('tr',null,['Label','Symbol','Status','Expires'].map(x=>h('th',{key:x},x)))),
      h('tbody',null,pairings.map(p=>h('tr',{key:p.id},
        h('td',null,p.label||'Unnamed terminal'),
        h('td',null,p.symbol),
        h('td',null,h(Badge,{status:p.status})),
        h('td',null,p.status==='pending'?rel(p.expires_at):rel(p.claimed_at||p.created_at))
      )))
    )
  );
}
function LinkDialog({onClose,onPaired}) {
  const [name,setName]=useState(''), [symbol,setSymbol]=useState('XAGUSD'), [busy,setBusy]=useState(false), [err,setErr]=useState('');
  async function submit(e) { e.preventDefault(); setBusy(true); setErr(''); try { onPaired(await api('/accounts',{name,symbol})); } catch(error) { setErr(error.message); } finally { setBusy(false); } }
  return h(Modal,{onClose},h('form',{id:'link-form',onSubmit:submit},h('div',{className:'dialog-heading'},h('div',null,h('span',{className:'eyebrow'},'PAIR FROM METATRADER'),h('h2',null,'Link an MT5 account')),h('button',{type:'button',className:'icon-button',onClick:onClose,'aria-label':'Close'},'x')),h('p',null,'Give the account a friendly label. MT5 will send its own login and server when the EA claims the code.'),err&&h('div',{className:'notice'},err),h('label',null,'Account label',h('input',{name:'name',placeholder:'My silver account',maxLength:60,value:name,onChange:e=>setName(e.target.value)})),h('label',null,'Silver symbol',h('input',{name:'symbol',value:symbol,maxLength:40,onChange:e=>setSymbol(e.target.value),required:true})),h('button',{className:'button primary full',type:'submit',disabled:busy},busy?'Creating code...':'Create pairing code')));
}
function PairingDialog({pairing,state,onClose}) {
  const record = state.pairings.find(p=>p.id===pairing.id) || pairing;
  const claimed = record.status==='claimed';
  return h(Modal,{onClose},h('div',{className:'dialog-heading'},h('div',null,h('span',{className:'eyebrow'},claimed?'ACCOUNT CONNECTED':'ONE-TIME PAIRING CODE'),h('h2',null,claimed?'Account paired':'Paste this code in MT5')),h('button',{type:'button',className:'icon-button',onClick:onClose,'aria-label':'Close'},'x')),h('p',null,claimed?'The terminal claimed the code. Its heartbeat will bring balances and trading permission into the dashboard.':'Attach ONLIDagger.mq5 to the MT5 silver chart, set ServerURL, paste this into PairCode, then enable Algo Trading.'),h('label',null,'PairCode',h('textarea',{readOnly:true,rows:2,value:pairing.code||'Claimed'})),h('div',{className:'info-banner'},claimed?'Status: claimed':'Expires '+dt(pairing.expires_at)),h('button',{className:'button primary full',onClick:()=>copyText(pairing.code)},'Copy pairing code'));
}
function ConfirmDialog({confirm,onClose,say}) {
  const [busy,setBusy]=useState(false);
  async function yes() { if(busy)return; setBusy(true); try { await confirm.onYes(); } catch(e) { say(e.message); } finally { setBusy(false); onClose(); } }
  return h(Modal,{onClose:()=>{if(!busy)onClose();}},h('div',{className:'dialog-heading'},h('h2',null,confirm.title)),h('p',null,confirm.message),h('div',{className:'dialog-actions'},h('button',{className:'button secondary',disabled:busy,onClick:onClose},'Cancel'),h('button',{className:'button primary',id:'confirm-yes',disabled:busy,onClick:yes},busy?'Saving...':'Confirm')));
}
ReactDOM.createRoot(document.getElementById('root')).render(h(App));
