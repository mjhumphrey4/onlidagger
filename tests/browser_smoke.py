"""Optional browser smoke test: pip install playwright; playwright install chromium."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from integration import server, Client, heartbeat

with server() as (base, _), sync_playwright() as p:
    chrome = os.environ.get('CHROME_BIN')
    browser = p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
    page = browser.new_page(viewport={'width':1440,'height':1100}, device_scale_factor=1)
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.goto(base)
    page.wait_for_selector('#metrics .metric')
    assert page.get_by_text('Your workspace starts here').is_visible()
    page.locator('.page-heading [data-action="link"]').click()
    page.locator('#link-form [name="name"]').fill('Browser demo')
    page.locator('#link-form [type="submit"]').click()
    page.wait_for_selector('dialog[open] textarea')
    code=page.locator('dialog[open] textarea').input_value()
    assert '-' in code and len(code)==9
    client=Client(base)
    paired=client.request('/api/ea/pair',dict(code=code,login='12345678',server='Broker-Demo',account_name='Browser demo',symbol='XAGUSD'),expected=201,csrf=False)
    token=paired['token']
    assert len(token)==64
    page.locator('dialog[open] .icon-button').click()
    client.request('/api/ea/sync',heartbeat(),token=token)
    page.locator('#refresh').click()
    expect(page.locator("#overview-accounts")).to_contain_text("10,000")
    page.locator('.nav-item[data-view="copier"]').click()
    page.locator('#order-form [name="type"]').select_option('sell_limit')
    for name, value in [('entry','35'),('sl','36'),('tp','34')]:
        page.locator(f'#order-form [name="{name}"]').fill(value)
    page.locator('[name="targets"]').check()
    page.locator('#order-form [type="submit"]').click()
    page.locator('#confirm-yes').click()
    expect(page.locator("#command-table")).to_contain_text("queued")
    page.locator('.nav-item[data-view="bot"]').click()
    page.locator('#bot-account').select_option('1')
    page.locator('#bot-form [type="submit"]').click()
    page.locator('#confirm-yes').click()
    expect(page.locator("#bot-runs")).to_contain_text("Requested: running")
    page.locator('[data-account-action="stop"]').click()
    page.locator('#confirm-yes').click()
    expect(page.locator("#bot-runs")).to_contain_text("Requested: stopped")
    page.locator('.nav-item[data-view="journal"]').click()
    page.wait_for_selector('#journal-table .empty')
    page.locator('.nav-item[data-view="accounts"]').click()
    assert 'Browser demo' in page.locator('#account-cards').inner_text()
    page.locator('.nav-item[data-view="overview"]').click()
    page.screenshot(path='/tmp/onlidagger-desktop.png',full_page=True,animations='disabled')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path='/tmp/onlidagger-mobile.png',full_page=True,animations='disabled')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.locator('#mobile-menu').click()
    page.locator('.nav-item[data-view="copier"]').click()
    assert page.locator('#view-copier').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    assert not errors, errors
    browser.close()
    print('PASS: Chrome desktop/mobile layout, account pairing, order placement, bot start/stop, navigation; no JavaScript errors')
