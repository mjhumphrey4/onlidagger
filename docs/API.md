# Implemented API

All paths are relative to the dashboard origin. No CORS support. Browser mutations require the same-origin session cookie and `X-CSRF-Token` from the dashboard's `meta[name=csrf-token]`. Browser routes rely on private network access; they are intentionally not protected by a login.

Responses are JSON except successful `/api/ea/sync`, which uses a small tab-separated protocol so the EA needs no third-party JSON parser. Errors use `{"error":"message"}` with 4xx/5xx status. Requests are limited to 1 MiB.

## Browser routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | Accounts, currency-separated stats, daily/weekly/monthly period stats, daily chart, latest 100 commands, pairing status, bot metrics, audit |
| GET | `/api/journal?page=1&account=1&search=XAG` | 50 deals per page; filters optional |
| POST | `/api/accounts` | `name`/`label` and `symbol`; returns one-time `code` for MT5 pairing |
| POST | `/api/accounts/{id}/rotate` | Rotate credential, re-enable account, stop bot; returns token |
| POST | `/api/accounts/{id}/revoke` | Disable EA API access and stop bot |
| POST | `/api/orders` | Distribute an immutable pending-order intent |
| POST | `/api/bots/{account_id}` | Start/configure a run or request stop |
| POST | `/api/stop` | Stop all bots and cancel undelivered commands |

Order request:

```json
{"request_key":"unique-client-key","accounts":[1,2],"type":"sell_limit","lots":0.01,"entry":35,"sl":36,"tp":34,"ttl":60}
```

`type` is `buy_limit`, `buy_stop`, `sell_limit` or `sell_stop`. `ttl` is 10–3600 seconds. Each selected account's configured symbol is used; lot sizing is fixed per account. Reusing the same key with the same payload returns the original intent. Reusing it with changed data returns 409. Entry/SL/TP values above are protocol examples, not trading recommendations.

Bot start request:

```json
{"desired":"running","lots":0.01,"max_positions":1,"max_volume":0.05,"spread":50,"daily_loss":50,"cooldown":120,"atr_sl":1.5,"atr_tp":2,"entry_min":0,"entry_max":0,"duration":1}
```

`duration` is hours (1–24); spread is broker points; daily loss is account currency. Zero entry bounds disable that bound. Start requires a fresh heartbeat with EA trading permission. Starting again creates a new run and increments the configuration version. Stop body: `{"desired":"stopped"}`.

## EA identity

New accounts are paired from MT5. The dashboard creates a short-lived code:

```json
{"name":"London demo","symbol":"XAGUSD"}
```

Successful response:

```json
{"id":1,"code":"ABCD-2345","expires_at":1790000000,"symbol":"XAGUSD"}
```

The EA claims that code without a bearer token:

```json
{"code":"ABCD-2345","login":"12345678","server":"Broker-Demo","account_name":"Trader Name","symbol":"XAGUSD"}
```

Successful `/api/ea/pair` response includes the permanent `token`. The EA stores it locally and uses it for subsequent sync, receipt and deal calls. Pairing an already-known login/server rotates that account's token, stops its bot, and cancels queued commands that were not delivered.

Every EA request is POST JSON with:

```http
Authorization: Bearer <per-account-token>
Content-Type: application/json
```

Every body includes `login` and `server` strings matching enrollment. Account identity comes from the token, not a user-supplied account ID. Tokens are stored as SHA-256 hashes and compared through their unique high-entropy digest lookup. Credentials and MT5 passwords are never included in dashboard state responses.

## POST /api/ea/sync

```json
{"login":"12345678","server":"Broker-Demo","currency":"USD","balance":10000,"equity":10005,"floating":5,"margin":10,"mode":"demo","trade_allowed":1,"positions":[],"bot_applied":0,"bot_message":"Stopped"}
```

Position objects contain `ticket` (string), `symbol`, `side`, `volume`, `price`, `profit`. `mode` is `demo`, `real` or `contest`. Successful response, with actual tab separators:

```text
TIME\t<unix-utc-seconds>
BOT\t<version>\t<running|stopped>\t<symbol>\t<lots>\t<max_positions>\t<max_volume>\t<spread_points>\t<daily_loss>\t<cooldown_seconds>\t<sl_atr>\t<tp_atr>\t<entry_min>\t<entry_max>\t<expires_utc>
CMD\t<id>\t<order_type>\t<symbol>\t<lots>\t<entry>\t<sl>\t<tp>\t<deadline_utc>\t<magic>\t<previous_status>
```

`TIME` precedes `BOT` and zero or more `CMD` rows. Up to 20 commands are selected by oldest update time for reconciliation fairness. A queued command becomes delivered in the same database transaction that selects it. `previous_status=queued` identifies first delivery. If a replayed command has no local receipt, the EA reconciles with the broker and otherwise reports unknown; it must not place a fresh order.

Magic is `700000000 + command_id`; bot magic is `610001`. Do not reuse these magic numbers for other EAs. Terminal local files preserve receipts. Command IDs must not be reused by resetting/restoring the database without reconciling terminal state.

## POST /api/ea/receipt

```json
{"login":"12345678","server":"Broker-Demo","command_id":1,"status":"accepted","ticket":"123456789012345678","retcode":"10008","message":"Broker accepted pending order"}
```

Allowed states: `unknown`, `accepted`, `partially_filled`, `filled`, `cancelled`, `expired`, `rejected`. Terminal states cannot regress. The EA returns broker order state on subsequent polls; broker acceptance does not mean filled. Receipts for another account are rejected. Tickets remain decimal strings end to end.

## POST /api/ea/deals

```json
{"login":"12345678","server":"Broker-Demo","deals":[{"ticket":"123","order_ticket":"122","position_id":"121","symbol":"XAGUSD","side":"sell","entry":"in","volume":0.01,"price":35,"profit":0,"commission":-0.1,"swap":0,"fee":0,"magic":"610001","time":1790000000,"comment":"OD Silver M1"}]}
```

At most 200 rows. `side` is buy/sell/cash; cash entries are excluded from trading performance. `entry` is in/out/inout/out_by. `(account_id,ticket)` is unique; repeats update cost/profit fields rather than creating duplicate deals. `time` is normalized UTC seconds; the EA uses the currently observed broker offset (historical DST caveat in README).
