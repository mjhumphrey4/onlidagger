# Deployment

## Build the frontend

The frontend and backend deploy independently. From the frontend project directory:

```sh
cd frontend
npm ci
npm run build
```

This creates the static website under `frontend/dist/`. Node is only needed when installing dependencies or rebuilding the frontend; it is not needed to run the PHP API.

## Ubuntu server

Copy the repository to `/var/www/onlidagger` and build `frontend/dist` there (or upload the built directory). Install `nginx php-fpm php-cli php-sqlite3`. Configure the PHP-FPM socket in [nginx.conf](../backend/deploy/nginx.conf); the example uses Ubuntu 24.04's PHP 8.3 socket. Check that `pdo_sqlite`, `session`, and `filter` are enabled.

```sh
sudo chown -R root:www-data /var/www/onlidagger
sudo chmod -R u=rwX,g=rX,o= /var/www/onlidagger
sudo chown -R www-data:www-data /var/www/onlidagger/backend/storage
sudo chmod 700 /var/www/onlidagger/backend/storage
sudo cp /var/www/onlidagger/backend/deploy/nginx.conf /etc/nginx/sites-available/onlidagger
sudo ln -sf /etc/nginx/sites-available/onlidagger /etc/nginx/sites-enabled/onlidagger
sudo nginx -t
sudo systemctl reload nginx
```

Nginx serves only `frontend/dist/` and sends `/api/` requests to `backend/public/index.php`. PHP source, database files, maintenance scripts, and the MT5 Expert Advisor stay outside the web root. The PHP service has no frontend files and returns API responses only. The frontend build has no PHP files.

The dashboard has no login screen. The sample Nginx configuration restricts the frontend and browser API to localhost and Tailscale; replace those allowlist entries with your operator's VPN/IP range. EA endpoints use account tokens and remain reachable to the MT5 terminals. Do not expose the anonymous browser API publicly.

## TLS for remote MT5 terminals

Point DNS at the server and issue the first certificate while port 80 is free:

```sh
sudo apt install certbot
sudo systemctl stop nginx
sudo certbot certonly --standalone -d mt5.example.com
sudo systemctl start nginx
```

Copy [nginx-production.conf.example](../backend/deploy/nginx-production.conf.example) into `/etc/nginx/sites-available/onlidagger`, replace `mt5.example.com`, the PHP-FPM socket, and VPN/IP allowlist, then enable it and validate renewal:

```sh
sudo ln -sf /etc/nginx/sites-available/onlidagger /etc/nginx/sites-enabled/onlidagger
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Use HTTPS for remote MT5 terminals. Add the HTTPS origin to MT5's WebRequest allowlist and preserve the `HTTP_AUTHORIZATION` FastCGI parameter. Avoid caching API responses.

The browser cannot log in to MT5 directly. The user creates a one-time PairCode in the frontend; the included `backend/mt5/ONLIDagger.mq5` Expert Advisor claims it from a logged-in terminal and sends account snapshots and history to the backend. No broker password is stored by this app.

## Maintenance

```sh
sudo cp backend/deploy/onlidagger-maintenance.service backend/deploy/onlidagger-maintenance.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now onlidagger-maintenance.timer
```

The maintenance command expires undelivered commands and bot runs and reports offline accounts/unknown commands to stdout (systemd journal). Request handling also performs expiry, so the CLI worker is useful for observability even during dashboard inactivity. Bot run expiration is enforced locally by the EA as well.

## Backups

```sh
sudo -u www-data php backend/bin/backup.php /path/writable/by/www-data/backup-2026-09-21.sqlite
```

Use a new destination each time. `VACUUM INTO` produces a consistent database snapshot, including committed WAL transactions. Protect backups because they include account identities and history. Store a copy off the server. Test restoring with PHP-FPM stopped: restore the snapshot as the database, remove stale `-wal`/`-shm` files only while no process holds the database, restore ownership, then restart PHP-FPM.

Never roll back the database and immediately resume trading: an older backup may contain commands that have since executed. Stop EA instances, reconcile broker history and command IDs first. Preserve terminal `MQL5/Files/ONLIDagger_*` receipts when moving a terminal. Command IDs/magic numbers are scoped to one database; do not reuse an old terminal receipt store with a newly reset database.

## Operational limits

One application server, local SQLite disk, one EA instance/terminal per linked broker account. Multi-host EA leadership and distributed database operation are not implemented. Measure queue age and heartbeat latency before increasing account count. The polling response includes at most 20 commands; accepted commands are revisited to discover fills/cancellations. HTTP is synchronous inside the EA, so slow API calls can delay signal evaluation. The strategy uses completed candles and refuses stale control connections.

Revoke a token to block the terminal's subsequent API calls. A disconnected EA stops new bot entries after 15 seconds but can still finish a command it has already received. Existing broker orders and protective exits remain at the broker.
