"""Optional frontend/API smoke test: install Playwright and Chromium first."""
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

from integration import server

BACKEND_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ROOT = BACKEND_ROOT.parent / 'frontend'

with server() as (api_origin, _):
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    origin = f'http://127.0.0.1:{port}'
    env = dict(os.environ, PHP_API_ORIGIN=api_origin)
    process = subprocess.Popen(
        [os.environ.get('NPM_BIN', 'npm'), 'run', 'dev', '--', '--host', '127.0.0.1', '--port', str(port)],
        cwd=FRONTEND_ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(100):
            try:
                with urlopen(origin, timeout=1):
                    break
            except Exception:
                if process.poll() is not None:
                    raise RuntimeError('Vite dev server exited before becoming ready')
                time.sleep(.1)
        else:
            raise RuntimeError('Vite dev server did not start')

        with sync_playwright() as playwright:
            chrome = os.environ.get('CHROME_BIN')
            browser = playwright.chromium.launch(**({'executable_path': chrome} if chrome else {}))
            page = browser.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin)
            page.wait_for_selector('#root svg')
            session = page.request.get(origin + '/api/session').json()
            assert len(session.get('csrf', '')) == 64
            assert not errors, errors
            browser.close()
    finally:
        process.terminate()
        process.wait(timeout=10)

print('PASS: Vite frontend loads and same-origin /api proxy starts a PHP session')
