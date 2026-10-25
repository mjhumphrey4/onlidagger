# ONLIDagger MT5 Manager

## Product

A central dashboard for linked MT5 accounts, an automatic trading journal, order distribution, and a configurable XAGUSD M1 trading agent. The server coordinates commands; each account's EA validates and executes them at its broker. Execution and profitability cannot be guaranteed.

## Deployment

Browser → HTTPS Nginx → static `frontend/dist/` and `/api` → PHP-FPM → SQLite on local disk.

Each running MT5 terminal → authenticated HTTPS → PHP API.

Ubuntu hosts the dashboard. MT5 terminals run on suitable terminal hosts, each logged into the intended account with the EA running and algorithmic trading enabled. Linking an account does not start its terminal. No broker passwords are stored by the dashboard.

Keep the Vite/React project under `frontend/` and PHP API, schema, terminal bridge, and operations scripts under `backend/`. `npm run build` writes only to `frontend/dist/`; PHP-FPM exposes API routes from `backend/public/` and does not render or bundle frontend files. In development, Vite proxies `/api` to the separate PHP server. In production, Nginx serves the build and forwards `/api` to PHP-FPM on the same origin.

Use SQLite WAL, foreign keys, short transactions, a busy timeout, and consistent online backups. A single server is the initial target; measure contention before increasing account count. Use a CLI maintenance worker for command expiry, reconciliation alerts and retention.

## Connectivity

Use outbound EA polling with a configurable interval, initially one second, bounded HTTP timeouts, jitter and reconnect backoff. Heartbeats publish account identity, connection state, balances, equity and broker server time. The dashboard labels stale accounts and never presents queued commands as executed.

MQL5 WebRequest is synchronous and unavailable in Strategy Tester. Keep trading strategy logic independent of HTTP so it can be tested locally. “Realtime” means measured low latency subject to polling, terminal load, network and broker delays; it is not simultaneous execution across brokers.

## Journal

Import broker deals using an overlapping history window and a durable cursor. Deduplicate by account, broker server and deal ticket. Preserve ticket identifiers as strings. Record entry/exit direction, position identifier, symbol, lots, price, commission, fee, swap, profit, broker timestamp and ingestion timestamp. Periodically reconcile a longer history window to recover missed events.

Separate orders, deals and positions: an order can fill partially, and hedging and netting accounts behave differently. Attribute bot deals by magic number and persisted execution mappings. Show realized net P/L as profit plus commission, fee and swap, and unrealized P/L separately. Do not combine different account currencies without explicit conversion rates. Deposits and withdrawals are cash flows, not strategy profit.

## Trade copier

The user selects accounts and submits one immutable order intent. In one database transaction create the intent and one command per target. A client idempotency key prevents repeated dashboard submissions; bind the key to a canonical payload hash and reject conflicting reuse.

Support buy limit, buy stop, sell limit and sell stop first. Inputs include symbol mapping, entry, stop loss, take profit, volume policy, expiration and execution deadline. Validate positive values and the side relationships of entry/SL/TP on the server. Each EA additionally validates the current quote, tick size, volume min/max/step, stop/freeze levels, margin, symbol availability, order types and trading permissions. Reject invalid volume rather than silently increasing risk.

Track each target independently: queued → delivered → submitting → broker accepted → partially filled/filled/cancelled/expired/rejected. Include an unknown/reconciliation-required state for ambiguous outcomes. Broker acceptance of a pending order is distinct from a fill.

Persist a command receipt locally before submission. After a crash or timeout, reconcile broker orders and deals before any retry. An HTTP lease expiring is not permission to resend an order. Cross-system exactly-once execution cannot be guaranteed; unresolved submissions require reconciliation and must not be retried blindly. Report partial distribution and do not automatically reverse successful accounts when another account fails.

OnTradeTransaction captures execution changes; history reconciliation repairs missing callbacks. Keep broker return codes and timestamps. A successful OrderSend return alone is not evidence of execution.

## XAGUSD M1 agent

“Short trades” provisionally means sell-only, pending clarification. The initial implementation uses a configurable sell-only EMA(9/21) pullback strategy with RSI(14) filtering and ATR(14) exits, defined in README.md. Its profitability remains unverified.

The dashboard publishes versioned desired state (running/stopped), a unique run ID, the selected account and explicit parameters. The EA acknowledges the applied version. A stop cancels future entries; cancelling pending orders and closing positions are separate explicit actions.

Configuration includes the broker's silver symbol, entry levels and trigger semantics, lot policy, stop loss, take profit, maximum exposure/positions, spread cap, cooldown, maximum daily loss and run expiration. M1 refers to the signal timeframe. Use completed bars unless intrabar logic is expressly specified. Never add martingale or loss-recovery sizing implicitly.

Run risk checks locally before each order. On stale control connectivity stop new entries after a configured grace period; continue managing existing positions and retain broker-side protective stops. Account for in-flight requests and pending orders in exposure limits. For netting accounts define volume limits as well as position counts. On terminal restart require valid unexpired configuration and reconcile current exposure before resuming.

Validate any strategy through broker-specific real-tick backtests with costs, out-of-sample and walk-forward evaluation, spread/slippage stress tests and forward testing on a demo account. Choose acceptance thresholds before tuning. Network integration tests are separate from Strategy Tester tests.

## Authentication and operations

Implementation decision: the user requested no login screen. Use network-restricted dashboard access (VPN/IP allowlist), CSRF-protected anonymous sessions, secure cookies and audit events. Anyone with dashboard network access has operator privileges. The dashboard creates short-lived PairCodes; the EA claims a code from inside MT5, reports the terminal's real login/server, receives a high-entropy per-account credential, and stores that token locally. Store only token hashes server-side, support rotation/revocation, and bind every authenticated EA request to the account login plus broker server. Use HTTPS, validate request size/schema and never accept arbitrary remote code.

Store SQLite, credentials and logs outside the public web root. Record operator actions, parameters, command transitions and broker responses without logging credentials. Monitor heartbeats, queue age, execution latency, unknown submissions, history lag and backup recovery.

## Original API outline (see docs/API.md for implemented routes)

- POST /api/accounts: enroll account (dashboard authentication).
- POST /api/order-intents: distribute immutable intent (dashboard authentication and idempotency key).
- GET /api/accounts, /api/journal, /api/commands: dashboard queries.
- PUT /api/bot-runs/{id}/desired-state: versioned start/stop and configuration.
- POST /api/ea/heartbeat: account snapshot (per-account credential).
- POST /api/ea/poll: receive commands scoped to authenticated account.
- POST /api/ea/receipts: idempotent execution observations.
- POST /api/ea/deals: idempotent history batches.

## Delivery phases

1. Dashboard, authentication, account enrollment, heartbeat and historical journal.
2. Demo-account copier, durable receipts, reconciliation and partial-failure reporting.
3. Bot control plane, strategy specification, offline strategy tests and demo forward testing.
4. Recovery drills, performance measurements and production deployment review.

Before real execution, test duplicate delivery, concurrent polling, loss of an acknowledgement, terminal restart during submission, expired commands, invalid symbols/volumes, partial fills, rejected orders, mixed currencies and cross-account authorization failures.

## Primary references

- https://www.mql5.com/en/docs/network/webrequest
- https://www.mql5.com/en/docs/trading/ordersend
- https://www.mql5.com/en/docs/runtime/testing
