# PHP API backend

Standalone PHP 8.2+ service for the MT5 journal. Requires `pdo_sqlite`, `session`, and `filter`. It serves API routes only; the independent React frontend is in `../frontend/`.

## Local API server

```sh
./bin/serve
```

The service listens on `127.0.0.1:8080` and initializes `storage/onlidagger.sqlite`. Set `DB_PATH` to override the database file. For the frontend, run its Vite dev server separately; Vite proxies `/api` to this service.

API routes and request formats are documented in [the API reference](../docs/API.md). Use [the deployment guide](../docs/DEPLOYMENT.md) for PHP-FPM, Nginx, HTTPS, maintenance, and backups. Remote MT5 terminals connect through the Expert Advisor in `mt5/`.
