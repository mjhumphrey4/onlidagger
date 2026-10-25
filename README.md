# ONLIDagger MT5 Manager

A separated Vite/React frontend, PHP/SQLite API backend, and MQL5 Expert Advisor. The frontend is under `frontend/`; PHP and MT5 server logic are under `backend/`. No Composer packages or broker passwords are required.

The previous PHP-rendered dashboard is retained in `legacy-dashboard/` as an archive; it is not part of the current deployment.

## Run locally

Requires Node 22.12+ for the frontend and PHP 8.2+ with `pdo_sqlite`, `session`, and `filter` for the backend.

```sh
./backend/bin/serve
```

In another terminal:

```sh
cd frontend
npm install --include=dev
npm run dev
```

Open the Vite URL shown in the terminal (default **http://localhost:8443**). Vite proxies `/api` requests to the PHP service on port 8080. The backend creates `backend/storage/onlidagger.sqlite` automatically. Only `backend/storage/` must be writable by PHP. Set `DB_PATH=/absolute/path/database.sqlite` to override its location. Do not serve the repository root.

## Build the frontend

From `frontend/`, run `npm run build`. Vite writes a standalone production bundle to `frontend/dist/`; PHP sources and frontend build output remain separate. `npm run dev` is for frontend iteration and does not require a production build.

On Ubuntu:

```sh
sudo apt update
sudo apt install nginx php-fpm php-cli php-sqlite3
```

See [deployment](docs/DEPLOYMENT.md) for Nginx, TLS, permissions and backups.

## Connect MetaTrader 5

1. Click **Link account**. Enter a friendly label and the broker's silver symbol if it differs from `XAGUSD`.
2. Copy the one-time **PairCode**. It expires after 15 minutes and can be claimed once.
3. Copy [ONLIDagger.mq5](backend/mt5/ONLIDagger.mq5) into the terminal's `MQL5/Experts/` directory. Open it in MetaEditor and compile with F7.
4. In MT5 → Tools → Options → Expert Advisors, allow WebRequest for your server origin. Use HTTPS for remote connections.
5. Attach the EA to **one XAGUSD M1 chart per account/terminal**. Set `ServerURL` (origin only, no `/api`) and paste the dashboard code into `PairCode`. Leave `ApiToken` blank for new pairing. Enable Algo Trading and EA trading permissions.
6. The EA sends the real MT5 login/server to the dashboard, receives a permanent account token, and stores it locally in `MQL5/Files`. Future launches can use the saved token or an explicit `ApiToken`. The account becomes online after the first heartbeat.
7. History imports in batches of 200 deals. Allow the initial import to finish before interpreting P/L metrics.

`127.0.0.1` only works when MT5 and PHP run on the same machine. A remote terminal needs a reachable server hostname/IP. Each broker account needs its own logged-in terminal. Running the same account on multiple terminal hosts is unsupported: the EA lock is local to a terminal, not a distributed trading lock.

## Included features

- Live account balances, equity, floating P/L, position snapshots and heartbeat status.
- Currency-separated portfolio metrics, daily/weekly/monthly realized P/L and a 30-day realized P/L chart.
- Automatic journal, paginated search/account filtering and current-page CSV export.
- Buy limit, buy stop, sell limit and sell stop distribution with fixed lots per account, mandatory SL/TP and delivery deadlines.
- Per-account execution states, broker tickets, return codes, persistent EA receipts and history reconciliation.
- XAGUSD M1 sell-only bot with remotely applied configuration, run expiration, start/stop acknowledgements and per-run deal/P&L counts.
- Credential rotation/revocation, CSRF protection, audit trail, maintenance command and consistent SQLite backups.

## Bot strategy

On a new M1 bar, the preceding completed candle must meet every condition:

- EMA(9) is below EMA(21).
- The earlier candle closed at/above its EMA(9); the latest completed candle closes below its EMA(9) and below its open.
- RSI(14) is strictly between 25 and 50.
- Current spread, entry price range, cooldown, total silver exposure and daily loss gates pass.

The EA sells at the current bid. SL is current ask + ATR(14) × SL multiplier, rounded upward to the tick grid. TP is current bid − ATR(14) × TP multiplier, rounded downward. Broker validation runs before submission. Fixed lots only; no martingale or recovery sizing.

Default EA settings block real-account execution. Enable `AllowRealTrading` locally in MT5 only after validating the strategy. This is an implemented research strategy, **not a proven profitable strategy**.

### Execution semantics

- The command deadline applies to **delivery/submission**, not the lifetime of an accepted broker pending order (GTC). Manage/cancel existing pending orders in MT5.
- **Stop bot** prevents future entries. **Stop all new activity** also cancels undelivered commands. Neither closes positions nor cancels pending orders already at the broker; delivered commands can still execute.
- Polling normally occurs each second but is synchronous and subject to network/broker delays. The bot stops new entries after 15 seconds without a successful control response. Broker-side SL/TP remains active.
- A command is never blindly replayed after its submission marker is saved. Missing receipts for previously delivered commands produce `unknown`, even if this means a lost request needs manual review. Do not delete receipt files to force a retry. Inspect broker orders/deals before creating a replacement intent.
- An uncertain bot submission pauses entries until a matching broker position/deal is found. If no evidence ever arrives, inspect broker history and the Experts log; stop the bot before manually repairing its local `bot_uncertain` marker.
- Position/volume limits include all positions and pending orders on the configured silver symbol. On netting accounts, the bot does not open while any silver exposure already exists, avoiding merging with another strategy.
- Daily loss is broker-day realized trading P/L including attached costs plus current account floating P/L, across all symbols. This is a gate on new entries, not a guaranteed loss ceiling. Separate broker cash/commission adjustments are excluded. The gate can clear if floating P/L recovers.
- Per-run bot metrics count entry deals since the run start using magic `610001`; partial fills count individually. Exit deals for older positions closed during the run also affect realized P/L. Journal rows are deals, not reconstructed round-trip trades.
- History uses a durable cursor with a one-hour overlap and a full `HistoryDays` replay on startup and daily (default 30 days). Downtime since the cursor is replayed even if it exceeds that window. Broker deal timestamps are normalized using the currently observed broker UTC offset; historical DST changes can shift displayed UTC times by an hour.

## Verification

```sh
python3 backend/tests/integration.py
```

The test runner starts PHP with a temporary SQLite database and exercises real HTTP routes: CSRF, enrollment, account isolation, invalid orders, duplicate distribution, EA delivery/receipts, journal ingestion, currency separation, bot controls, revocation and stop behavior. Set `PHP_BIN` if PHP is not on PATH.

For MT5, compile in MetaEditor and use Strategy Tester with **Every tick based on real ticks**, the broker's silver symbol and M1. `Tester*` inputs run the same strategy offline with no HTTP calls. Then use demo accounts to test the complete bridge, including restarts, lost acknowledgements, invalid broker settings and pending-order fills. See [MT5 verification](docs/MT5-VERIFICATION.md).

## Security boundary

No login is intentional. Anyone who can access the dashboard can operate connected accounts. Keep the dashboard and browser API behind a private network/VPN or an Nginx IP allowlist. The provided Nginx configuration restricts these paths and leaves only authenticated EA paths reachable externally. CSRF does not replace access control. Remote EA traffic must use HTTPS.

See [architecture](docs/ARCHITECTURE.md) and [API protocol](docs/API.md).
