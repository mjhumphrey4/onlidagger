# Frontend

Standalone Vite + React project. It contains no PHP runtime or backend source.

## Development

```sh
npm ci
npm run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8080`. Start the PHP API separately with `../backend/bin/serve`, or set `PHP_API_ORIGIN` to another API origin.

## Production build

```sh
npm run build
```

The command type-checks TypeScript and writes the deployable static site to `dist/`. Production Nginx serves that directory and sends `/api` to the PHP backend. No backend files are copied into the build.
