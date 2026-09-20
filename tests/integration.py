#!/usr/bin/env python3
"""Black-box HTTP tests. Standard-library only. Never touches the application DB."""
import contextlib
import http.cookiejar
import json
import os
from pathlib import Path
import re
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]

@contextlib.contextmanager
def server():
    php = os.environ.get('PHP_BIN') or shutil.which('php')
    if not php:
        raise RuntimeError('PHP not found; set PHP_BIN to a PHP 8.2+ executable')
    with tempfile.TemporaryDirectory(prefix='onlidagger-test-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        dbpath = str(Path(tmp) / 'test.sqlite')
        env = dict(os.environ, DB_PATH=dbpath)
        with open(Path(tmp) / 'server.log', 'w+') as log:
            process = subprocess.Popen([php, '-S', f'127.0.0.1:{port}', '-t', 'public', 'public/router.php'], cwd=ROOT, env=env, stdout=log, stderr=log)
            base = f'http://127.0.0.1:{port}'
            try:
                for _ in range(100):
                    try:
                        urllib.request.urlopen(base, timeout=1).close(); break
                    except (urllib.error.URLError, ConnectionError):
                        if process.poll() is not None:
                            log.seek(0); raise RuntimeError(log.read())
                        time.sleep(.1)
                else: raise RuntimeError('PHP server did not start')
                yield base, dbpath
            finally:
                process.terminate(); process.wait(timeout=10)

class Client:
    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        page = self.opener.open(base).read().decode()
        self.csrf = re.search(r'name="csrf-token" content="([^"]+)"', page).group(1)

    def request(self, path, data=None, token=None, expected=200, csrf=True):
        headers = {}
        if data is not None:
            headers['Content-Type'] = 'application/json'
            if csrf: headers['X-CSRF-Token'] = self.csrf
        if token: headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(self.base + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try: response = self.opener.open(req, timeout=10)
        except urllib.error.HTTPError as e: response = e
        text = response.read().decode()
        assert response.code == expected, (path, response.code, expected, text)
        return json.loads(text) if 'application/json' in response.headers.get('Content-Type', '') else text


def heartbeat(login='12345678', server='Broker-Demo', currency='USD', version=0):
    return dict(login=login, server=server, currency=currency, balance=10000, equity=10005,
                floating=5, margin=10, mode='demo', trade_allowed=1, positions=[],
                bot_applied=version, bot_message='Running: waiting for M1 signal')


def bot_config():
    return dict(desired='running', lots=.01, max_positions=1, max_volume=.05, spread=50,
                daily_loss=50, cooldown=120, atr_sl=1.5, atr_tp=2, entry_min=0, entry_max=0, duration=1)


def pair_account(client, name, login, server, symbol='XAGUSD'):
    pairing = client.request('/api/accounts', dict(name=name, symbol=symbol), expected=201)
    assert re.match(r'^[A-Z2-9]{4}-[A-Z2-9]{4}$', pairing['code'])
    result = client.request('/api/ea/pair', dict(code=pairing['code'], login=login, server=server, account_name=name, symbol=symbol), expected=201, csrf=False)
    assert result['token'] and len(result['token']) == 64
    return result


def run():
    with server() as (base, dbpath):
        c = Client(base)
        c.request('/api/accounts', {}, expected=403, csrf=False)
        assert c.request('/api/state')['accounts'] == []
        a = pair_account(c, 'Silver demo', '12345678', 'Broker-Demo')
        b = pair_account(c, 'Euro demo', '23456789', 'Broker-Demo', 'XAGUSD.a')
        stale = c.request('/api/accounts', dict(name='Duplicate', symbol='XAGUSD'), expected=201)
        c.request('/api/ea/pair', dict(code=stale['code'], login='34567890', server='Broker-Demo', account_name='Duplicate', symbol='XAGUSD'), expected=201, csrf=False)
        c.request('/api/ea/pair', dict(code=stale['code'], login='34567890', server='Broker-Demo', account_name='Duplicate', symbol='XAGUSD'), expected=404, csrf=False)
        c.request('/api/bots/1', bot_config(), expected=422)
        c.request('/api/ea/sync', heartbeat(), token='invalid', expected=401)
        c.request('/api/ea/sync', heartbeat(login='wrong'), token=a['token'], expected=401)
        response = c.request('/api/ea/sync', heartbeat(), token=a['token'])
        assert 'BOT\t0\tstopped\tXAGUSD' in response
        c.request('/api/ea/sync', heartbeat(login='23456789', currency='EUR'), token=b['token'])
        payload = dict(request_key='test-placement-1', type='sell_limit', lots=.01, entry=35, sl=36, tp=34, ttl=60, accounts=[1,2])
        c.request('/api/orders', dict(payload, sl=34), expected=422)
        c.request('/api/orders', dict(payload, lots=-1), expected=422)
        intent = c.request('/api/orders', payload, expected=201)
        repeat = c.request('/api/orders', payload, expected=201)
        assert intent['id'] == repeat['id'] and repeat['duplicate']
        c.request('/api/orders', dict(payload, lots=.02), expected=409)
        commands = c.request('/api/state')['commands']
        assert len(commands) == 2
        one_cmd = next(x for x in commands if x['account_id'] == 1)
        second = next(x for x in commands if x['account_id'] == 2)
        receipt = dict(login='12345678', server='Broker-Demo', command_id=one_cmd['id'], status='accepted', ticket='90071992547409931', retcode='10008', message='Broker accepted')
        c.request('/api/ea/receipt', receipt, token=a['token'], expected=409)
        response = c.request('/api/ea/sync', heartbeat(), token=a['token'])
        assert f"CMD\t{one_cmd['id']}\tsell_limit\tXAGUSD\t" in response and response.rstrip().endswith('queued')
        response = c.request('/api/ea/sync', heartbeat(), token=a['token'])
        assert response.rstrip().endswith('delivered')
        c.request('/api/ea/receipt', dict(receipt, command_id=second['id']), token=a['token'], expected=404)
        c.request('/api/ea/receipt', receipt, token=a['token'])
        c.request('/api/ea/receipt', dict(receipt, status='filled'), token=a['token'])
        c.request('/api/ea/receipt', receipt, token=a['token'])
        updated = next(x for x in c.request('/api/state')['commands'] if x['id'] == one_cmd['id'])
        assert updated['status'] == 'filled' and updated['ticket'] == receipt['ticket']
        deal = dict(ticket='90071992547409932', order_ticket=receipt['ticket'], position_id='90071992547409933', symbol='XAGUSD', side='sell', entry='out', volume=.01, price=34, profit=10, commission=-1, swap=-.5, fee=-.25, magic='610001', time=int(time.time()), comment='test')
        batch = dict(login='12345678', server='Broker-Demo', deals=[deal])
        c.request('/api/ea/deals', batch, token=a['token']);c.request('/api/ea/deals', batch, token=a['token'])
        c.request('/api/ea/deals', dict(batch,deals=[dict(deal,ticket=90071992547409932)]), token=a['token'],expected=422)
        c.request('/api/ea/deals', dict(batch,deals=[dict(deal,ticket='1',side='cash',profit=500)]),token=a['token'])
        journal = c.request('/api/journal')
        assert journal['total']==1 and journal['deals'][0]['ticket']==deal['ticket']
        assert c.request('/api/journal?account=2')['total']==0
        assert c.request('/api/journal?search=missing')['total']==0
        stats = c.request('/api/state')['stats']
        assert len(stats)==1 and stats[0]['net']==8.25 and stats[0]['currency']=='USD'
        state_now = c.request('/api/state')
        account_stats = {int(x['account_id']): x['net'] for x in state_now['account_stats']}
        assert account_stats[1] == 8.25
        periods = {(x['period'], x['currency']): x['net'] for x in state_now['period_stats']}
        account_periods = {(x['period'], int(x['account_id'])): x['net'] for x in state_now['account_period_stats']}
        assert periods[('today','USD')] == 8.25 and periods[('week','USD')] == 8.25 and periods[('month','USD')] == 8.25
        assert account_periods[('today',1)] == 8.25 and account_periods[('week',1)] == 8.25 and account_periods[('month',1)] == 8.25
        euro = dict(deal, ticket='90071992547409935', profit=20)
        c.request('/api/ea/deals',dict(login='23456789',server='Broker-Demo',deals=[euro]),token=b['token'])
        currency_stats = {x['currency']:x['net'] for x in c.request('/api/state')['stats']}
        assert currency_stats == {'EUR':18.25,'USD':8.25}
        c.request('/api/bots/1',bot_config())
        state = c.request('/api/state');account=state['accounts'][0]
        assert account['desired']=='running' and account['version']==1 and account['bot_applied']==0
        response = c.request('/api/ea/sync', heartbeat(version=1), token=a['token'])
        assert 'BOT\t1\trunning\tXAGUSD' in response
        c.request('/api/bots/1',dict(bot_config(),max_volume=.001),expected=422)
        c.request('/api/bots/1',{'desired':'stopped'})
        assert c.request('/api/state')['accounts'][0]['desired']=='stopped'
        c.request('/api/orders',dict(payload,request_key='expires',accounts=[1]),expected=201)
        with sqlite3.connect(dbpath) as db: db.execute("UPDATE commands SET expires_at=0 WHERE status='queued' AND account_id=1")
        assert c.request('/api/state')['commands'][0]['status']=='expired'
        c.request('/api/bots/1',bot_config())
        with sqlite3.connect(dbpath) as db: db.execute('UPDATE bots SET expires_at=0 WHERE account_id=1')
        assert c.request('/api/state')['accounts'][0]['desired']=='stopped'
        with sqlite3.connect(dbpath) as db: db.execute('UPDATE accounts SET last_seen=0 WHERE id=1')
        c.request('/api/bots/1',bot_config(),expected=422)
        rotated=c.request('/api/accounts/1/rotate',{})
        c.request('/api/ea/sync',heartbeat(),token=a['token'],expected=401)
        c.request('/api/ea/sync',heartbeat(),token=rotated['token'])
        c.request('/api/orders',dict(payload,request_key='stop',accounts=[1]),expected=201)
        c.request('/api/stop',{})
        assert c.request('/api/state')['commands'][0]['status']=='cancelled'
        c.request('/api/accounts/1/revoke',{})
        c.request('/api/ea/sync',heartbeat(),token=rotated['token'],expected=401)
        c.request('/api/orders',dict(payload,request_key='revoked',accounts=[1]),expected=422)
        c.request('/storage/onlidagger.sqlite',expected=404)
        c.request('/app/schema.sql',expected=404)
        assert 'token_hash' not in json.dumps(c.request('/api/state'))
        print('PASS: enrollment, CSRF, isolation, order validation, idempotency, receipts, expiry, journal deduplication, currencies, bot controls, stop and credential rotation/revocation')

if __name__ == '__main__': run()
