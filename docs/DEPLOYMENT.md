# Deployment

## Ubuntu server

Copy the project to `/var/www/onlidagger`. Install `nginx php-fpm php-cli php-sqlite3`. Configure the actual installed PHP-FPM socket in [nginx.conf](../deploy/nginx.conf); the example uses Ubuntu 24.04's PHP 8.3 path. Run `php -m` and verify `pdo_sqlite`, `session` and `filter`.

```sh
sudo chown -R root:www-data /var/www/onlidagger
sudo chmod -R u=rwX,g=rX,o= /var/www/onlidagger
sudo chown -R www-data:www-data /var/www/onlidagger/storage
sudo chmod 700 /var/www/onlidagger/storage
sudo cp /var/www/onlidagger/deploy/nginx.conf /etc/nginx/sites-available/onlidagger
sudo ln -s /etc/nginx/sites-available/onlidagger /etc/nginx/sites-enabled/onlidagger
sudo nginx -t
sudo systemctl reload nginx
```

Set the real hostname and TLS certificate before remote use. Nginx routes only `public/index.php` to PHP and serves `public/assets/` statically. Database, source and receipt files must not be publicly served. The default website needs no login: replace the dashboard location's allowlist with your operator IP or use the provided Tailscale range. Do not replace it with public access on an internet-facing server.

The EA location is separate from the dashboard allowlist and authenticates every request with a per-account bearer token. Use TLS; MT5's WebRequest allowlist must contain the HTTPS origin. Retain the `HTTP_AUTHORIZATION` FastCGI parameter. Avoid proxy configurations that cache API responses.

## Maintenance

```sh
sudo cp deploy/onlidagger-maintenance.service deploy/onlidagger-maintenance.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now onlidagger-maintenance.timer
```

The maintenance command expires undelivered commands and bot runs and reports offline accounts/unknown commands to stdout (systemd journal). Request handling also performs expiry, so the CLI worker is useful for observability even during dashboard inactivity. Bot run expiration is enforced locally by the EA as well.

## Backups

```sh
sudo -u www-data php bin/backup.php /path/writable/by/www-data/backup-2026-09-21.sqlite
```

Use a new destination each time. `VACUUM INTO` produces a consistent database snapshot, including committed WAL transactions. Protect backups because they include account identities and history. Store a copy off the server. Test restoring with PHP-FPM stopped: restore the snapshot as the database, remove stale `-wal`/`-shm` files only while no process holds the database, restore ownership, then restart PHP-FPM.

Never roll back the database and immediately resume trading: an older backup may contain commands that have since executed. Stop EA instances, reconcile broker history and command IDs first. Preserve terminal `MQL5/Files/ONLIDagger_*` receipts when moving a terminal. Command IDs/magic numbers are scoped to one database; do not reuse an old terminal receipt store with a newly reset database.

## Operational limits

One application server, local SQLite disk, one EA instance/terminal per linked broker account. Multi-host EA leadership and distributed database operation are not implemented. Measure queue age and heartbeat latency before increasing account count. The polling response includes at most 20 commands; accepted commands are revisited to discover fills/cancellations. HTTP is synchronous inside the EA, so slow API calls can delay signal evaluation. The strategy uses completed candles and refuses stale control connections.

Revoke a token to block the terminal's subsequent API calls. A disconnected EA stops new bot entries after 15 seconds but can still finish a command it has already received. Existing broker orders and protective exits remain at the broker.
