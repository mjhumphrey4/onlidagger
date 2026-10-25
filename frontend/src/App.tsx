import { useCallback, useEffect, useState, type ReactNode } from "react"
import FeaturePages from "./FeaturePages"
import { api, type AppState } from "./api"

type IconName = "home" | "book" | "copy" | "chart" | "wallet" | "settings" | "search" | "bell" | "plus" | "arrow" | "chevron" | "calendar" | "spark" | "check" | "shield" | "target" | "menu" | "close" | "dots" | "link"

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const shapes: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 4.5v17M8 7h8M8 11h5" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    chart: <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />,
    wallet: <><path d="M3 6.5h15a3 3 0 0 1 3 3v9H5a2 2 0 0 1-2-2z" /><path d="M3 7V5a2 2 0 0 1 2-2h12v3.5M16 12h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7a6 6 0 0 0-.8-1.8l.9-1.9L15 4l-1.9.9a6 6 0 0 0-1.9-.8L10.5 2h-3l-.7 2.1A6 6 0 0 0 5 5l-2-.9L1 6.2l.9 1.9a6 6 0 0 0-.8 1.8l-2 .7v3l2 .7a6 6 0 0 0 .8 1.8L1 18l2.1 2.1 1.9-.9a6 6 0 0 0 1.8.8l.7 2h3l.7-2a6 6 0 0 0 1.9-.8l1.9.9 2.1-2.1-.9-1.9a6 6 0 0 0 .8-1.8z" transform="translate(2)" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
    spark: <path d="m13 2-8 12h7l-1 8 8-12h-7z" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 2 4 5v6c0 5 3.4 9.1 8 11 4.6-1.9 8-6 8-11V5z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    dots: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></>,
  }
  return <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>{shapes[name]}</svg>
}

function Button({ children, className = "", onClick, title }: { children: ReactNode; className?: string; onClick?: () => void; title?: string }) {
  return <button className={`button ${className}`} onClick={onClick} title={title} type="button">{children}</button>
}

const navigation: { label: string; icon: IconName }[] = [
  { label: "Command center", icon: "home" },
  { label: "Trade journal", icon: "book" },
  { label: "Trade copier", icon: "copy" },
  { label: "Performance", icon: "chart" },
  { label: "Accounts", icon: "wallet" },
]

function LinkAccountDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, symbol: string) => Promise<{ code: string; expires_at: number; symbol: string }> }) {
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [pairing, setPairing] = useState<{ code: string; expires_at: number; symbol: string } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    try { setPairing(await onCreated(name.trim(), symbol.trim())) }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create pairing code") }
    finally { setBusy(false) }
  }
  return (
    <div className="fp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-labelledby="pair-title" aria-modal="true" className="fp-modal" role="dialog">
        <div className="fp-modal-head"><div><span>MT5 ACCOUNT CONNECTION</span><h2 id="pair-title">Link an account</h2><p>Pair from your logged-in MT5 terminal. The app never asks for your broker password.</p></div><Button className="fp-icon-button" onClick={onClose} title="Close"><Icon name="close" /></Button></div>
        {!pairing ? <form onSubmit={submit}>
          <div className="fp-form-grid">
            <label><span>Account label</span><input autoFocus maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Optional name" value={name} /></label>
            <label><span>Broker symbol</span><input required maxLength={40} onChange={(event) => setSymbol(event.target.value)} placeholder="e.g. EURUSD" value={symbol} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="fp-modal-footer"><Button className="fp-secondary" onClick={onClose}>Cancel</Button><button className="fp-action fp-primary" disabled={busy || !symbol.trim()} type="submit">{busy ? "Creating…" : "Create pairing code"}</button></div>
        </form> : <div className="pairing-result">
          <p>Enter this one-time code in the ONLIDagger Expert Advisor settings in MT5. It expires in 15 minutes.</p>
          <code aria-label="Pairing code">{pairing.code}</code>
          <ol><li><a className="ea-download" href="/api/ea/download" download>Download ONLIDagger.mq5</a>, copy it into your MT5 <code>MQL5/Experts</code> folder, and compile it in MetaEditor.</li><li>Allow WebRequest for <strong>{window.location.origin}</strong> in MT5 settings.</li><li>Attach the EA to a chart on the account you want to link. Set ServerURL to this origin and paste the code into PairCode.</li></ol>
          <p className="pairing-symbol">Broker symbol: <strong>{pairing.symbol}</strong> · Expires {new Date(pairing.expires_at * 1000).toLocaleTimeString()}</p>
          <div className="fp-modal-footer"><Button className="fp-primary" onClick={onClose}>Done</Button></div>
        </div>}
      </section>
    </div>
  )
}

function CommandCenter({ state, onLink, onNavigate }: { state: AppState; onLink: () => void; onNavigate: (page: string) => void }) {
  const online = state.accounts.filter((account) => account.online).length
  const dealCount = state.stats.reduce((sum, metric) => sum + Number(metric.deals), 0)
  const currencies = state.stats
  return <div className="dashboard">
    <section className="main-column">
      <div className="welcome-row"><div><p className="overline">ACCOUNT OVERVIEW</p><h1>Trade the plan, <em>not the noise.</em></h1><p className="welcome-copy">Live account and trade data from your connected MT5 terminals.</p></div><div className="welcome-actions"><Button className="light-button" onClick={onLink}><Icon name="plus" size={17} /> Link MT5 account</Button></div></div>
      <section className="hero-card"><div className="hero-glow" /><div className="hero-summary"><div className="balance-label"><span>Connected accounts</span><i>{online} online</i></div><div className="hero-number">{state.accounts.length}</div><div className="hero-change">{dealCount} imported deals</div><div className="hero-metrics"><div><small>Accounts</small><strong>{state.accounts.length}</strong></div><div><small>Open positions</small><strong>{state.accounts.reduce((n, a) => n + a.positions.length, 0)}</strong></div><div><small>Last sync</small><strong>{state.accounts.length ? new Date(Math.max(...state.accounts.map((a) => a.last_seen || 0)) * 1000).toLocaleTimeString() : "—"}</strong></div></div></div><div className="hero-visual empty-visual"><span>{state.accounts.length ? "Portfolio data is separated by account currency." : "Your account data will appear here after linking MT5."}</span></div></section>
      <section className="insights-grid"><div className="metric-card"><small>Linked accounts</small><strong>{state.accounts.length}</strong><p>{online} online · {state.accounts.length - online} offline</p></div><div className="metric-card"><small>Imported deals</small><strong>{dealCount}</strong><p>Synced from MT5 history</p></div><div className="metric-card"><small>Active positions</small><strong>{state.accounts.reduce((n, a) => n + a.positions.length, 0)}</strong><p>Current terminal snapshots</p></div></section>
      <section className="trades-card"><div className="section-heading"><div><h2>Performance by currency</h2><p>Results stay separate across account currencies</p></div><Button className="inline-button" onClick={() => onNavigate("Performance")}>Performance <Icon name="arrow" size={14} /></Button></div>{currencies.length ? <div className="currency-summary">{currencies.map((metric) => <div className="currency-row" key={metric.currency}><strong>{metric.currency}</strong><span>{metric.deals} deals</span><b>{money(metric.net, metric.currency)}</b></div>)}</div> : <EmptyState text="No trades yet. Link an MT5 account to import its history." />}</section>
    </section>
    <aside className="copier-column"><section className="copier-card"><div className="copier-head"><div><span className="copier-kicker"><i /> MT5 BRIDGE</span><h2>Connection status</h2><p>{state.accounts.length ? `${online} of ${state.accounts.length} terminals online` : "No MT5 accounts linked"}</p></div><Icon name="link" /></div><div className="connection"><span className="connection-icon"><Icon name="shield" size={15} /></span><div><strong>{state.accounts.length ? "Terminal managed" : "Ready to pair"}</strong><small>Each account connects from its logged-in MT5 terminal</small></div></div><Button className="link-button" onClick={onLink}><Icon name="link" size={14} /> Link another MT5 account</Button></section><section className="trades-card"><div className="section-heading"><div><h2>Accounts</h2><p>Live connection health</p></div><Button className="inline-button" onClick={() => onNavigate("Accounts")}>View all</Button></div>{state.accounts.length ? state.accounts.slice(0, 5).map((account) => <div className="account-mini-row" key={account.id}><span className={`status-dot ${account.online ? "online" : "offline"}`} /><span><strong>{account.name || `MT5 ${account.login}`}</strong><small>{account.server} · {account.login}</small></span><b>{account.online ? "Online" : "Offline"}</b></div>) : <EmptyState text="No linked accounts" />}</section></aside>
  </div>
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div> }
export function money(value: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(Number(value) || 0) }

export default function App() {
  const [active, setActive] = useState("Command center")
  const [menuOpen, setMenuOpen] = useState(false)
  const [state, setState] = useState<AppState | null>(null)
  const [error, setError] = useState("")
  const [linkOpen, setLinkOpen] = useState(false)
  const refresh = useCallback(async () => {
    try { setState(await api.state()); setError("") }
    catch (reason) { setError(reason instanceof Error ? reason.message : "API request failed") }
  }, [])
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(timer) }, [refresh])
  const createPairing = async (name: string, symbol: string) => {
    const pairing = await api.createPairing(name, symbol)
    await refresh()
    return pairing
  }
  const navigate = (page: string) => { setActive(page); setMenuOpen(false) }
  return <div className="shell">
    <aside className={`rail ${menuOpen ? "rail-open" : ""}`}><div className="logo"><span className="logo-symbol"><i /><i /></span><span>MT5 Journal</span></div><Button className="close-menu" onClick={() => setMenuOpen(false)} title="Close navigation"><Icon name="close" /></Button><nav className="navigation"><span className="nav-caption">Workspace</span>{navigation.map((item) => <Button className={`nav-link ${active === item.label ? "active" : ""}`} key={item.label} onClick={() => navigate(item.label)}><Icon name={item.icon} /><span>{item.label}</span></Button>)}</nav><div className="rail-footer"><Button className="nav-link" onClick={() => setLinkOpen(true)}><Icon name="link" /><span>Link MT5 account</span></Button><div className="user-card"><div className="avatar">MT</div><span><strong>Trading workspace</strong><small>{state ? `${state.accounts.length} linked accounts` : "Connecting…"}</small></span></div></div></aside>
    {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
    <main className="workspace"><header className="topbar"><div className="topbar-start"><Button className="square-button menu-button" onClick={() => setMenuOpen(true)} title="Open navigation"><Icon name="menu" /></Button><div className="crumb"><span>Workspace</span><Icon name="chevron" size={12} /><strong>{active}</strong></div></div><div className="topbar-actions"><div className="market-status"><i /> {state ? `${state.accounts.filter((account) => account.online).length} MT5 online` : "Connecting"}</div><Button className="square-button" onClick={() => void refresh()} title="Refresh data"><Icon name="spark" /></Button><Button className="profile-button" onClick={() => setLinkOpen(true)}><span className="mini-avatar">+</span><span>Link account</span></Button></div></header>
      {error && <div className="api-error" role="alert"><strong>Backend connection error</strong><span>{error}</span><Button className="fp-secondary" onClick={() => void refresh()}>Retry</Button></div>}
      {!state ? <div className="loading-state">Loading your account data…</div> : active === "Command center" ? <CommandCenter state={state} onLink={() => setLinkOpen(true)} onNavigate={navigate} /> : <FeaturePages page={active} state={state} onLink={() => setLinkOpen(true)} onChanged={refresh} onError={setError} />}
    </main>
    {linkOpen && <LinkAccountDialog onClose={() => setLinkOpen(false)} onCreated={createPairing} />}
  </div>
}
