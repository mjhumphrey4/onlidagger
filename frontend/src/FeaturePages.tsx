import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { api, type Account, type AppState, type Deal } from "./api"

type PageProps = { state: AppState; onLink: () => void; onChanged: () => Promise<void>; onError: (message: string) => void }
type ActionProps = { children: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }

function Action({ children, className = "", onClick, disabled }: ActionProps) {
  return <button className={`fp-action ${className}`} disabled={disabled} onClick={onClick} type="button">{children}</button>
}

function Icon({ type }: { type: "plus" | "filter" | "download" | "search" | "arrow" | "check" | "shield" | "close" | "refresh" | "link" }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 2 4 5v6c0 5 3.4 9.1 8 11 4.6-1.9 8-6 8-11V5z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" /></>,
  }
  return <svg className="fp-icon" fill="none" viewBox="0 0 24 24">{paths[type]}</svg>
}

function Header({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: ReactNode }) {
  return <div className="fp-header"><div><p className="fp-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div><div className="fp-header-actions">{actions}</div></div>
}

function Empty({ children = "No data yet. Connect an MT5 account to get started." }: { children?: ReactNode }) {
  return <div className="empty-state">{children}</div>
}

function money(value: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(value || 0) }
  catch { return `${currency || ""} ${(value || 0).toFixed(2)}` }
}

function AccountCard({ account, index, onChanged, onError }: { account: Account; index: number; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState("")
  const run = async (kind: "rotate" | "revoke") => {
    if (kind === "revoke" && !window.confirm(`Revoke API access for ${account.name || account.login}? Its MT5 terminal will stop syncing.`)) return
    setBusy(true); setToken("")
    try {
      if (kind === "rotate") setToken((await api.rotateAccount(account.id)).token)
      else await api.revokeAccount(account.id)
      await onChanged()
    } catch (reason) { onError(reason instanceof Error ? reason.message : "Account action failed") }
    finally { setBusy(false) }
  }
  return <section className="fp-panel account-page-card">
    <div className="account-card-heading"><span className={`route-avatar tone-${index % 3}`}>{(account.name || account.login).charAt(0)}</span><span><strong>{account.name || `MT5 ${account.login}`}</strong><small>{account.server} · {account.login}</small></span><i className={account.online && account.enabled ? "account-online" : "account-offline"}>{!account.enabled ? "REVOKED" : account.online ? "ONLINE" : "OFFLINE"}</i></div>
    <p>Account equity</p><h2>{account.currency ? money(account.equity, account.currency) : "Waiting for first MT5 sync"}</h2>
    <div className="account-change"><span>Balance</span><strong>{account.currency ? money(account.balance, account.currency) : "—"}</strong><small>{account.mode === "unknown" ? "Awaiting terminal" : account.mode.toUpperCase()}</small></div>
    <div className="account-change"><span>Floating P&amp;L</span><strong className={account.floating >= 0 ? "fp-profit" : "fp-loss"}>{account.currency ? money(account.floating, account.currency) : "—"}</strong><small>{account.positions.length} open positions</small></div>
    <div className="account-change"><span>Symbol</span><strong>{account.symbol}</strong><small>{account.trade_allowed ? "Trading permitted" : "Trading disabled"}</small></div>
    <div className="account-actions"><Action className="fp-secondary" disabled={busy} onClick={() => void run("rotate")}><Icon type="refresh" /> Rotate credential</Action><Action className="fp-secondary danger-action" disabled={busy || !account.enabled} onClick={() => void run("revoke")}>Revoke access</Action></div>
    {token && <div className="token-reveal"><strong>New EA token (shown once)</strong><code>{token}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(token)}>Copy token</button><small>Paste it into the EA ApiToken input on this terminal.</small></div>}
  </section>
}

function AccountsPage({ state, onLink, onChanged, onError }: PageProps) {
  const currencies = [...new Set(state.accounts.map((account) => account.currency).filter(Boolean))]
  return <div className="feature-page">
    <Header eyebrow="MT5 CONNECTIONS" title="Trading accounts" copy="Pair an account from its logged-in MT5 terminal and monitor its connection here." actions={<Action className="fp-primary" onClick={onLink}><Icon type="plus" /> Link MT5 account</Action>} />
    {state.accounts.length ? <div className="account-page-grid">{state.accounts.map((account, index) => <AccountCard account={account} index={index} key={account.id} onChanged={onChanged} onError={onError} />)}</div> : <section className="fp-panel accounts-empty"><span className="empty-account-icon"><Icon type="link" /></span><h2>No MT5 accounts linked</h2><p>Create a one-time PairCode, then enter it in the Expert Advisor attached to your MT5 terminal.</p><Action className="fp-primary" onClick={onLink}><Icon type="plus" /> Link your first account</Action></section>}
    <section className="fp-panel pairing-help"><div className="section-title"><div><span>CONNECTION GUIDE</span><h2>How MT5 pairing works</h2></div></div><ol><li>Create a pairing code in this app.</li><li><a className="ea-download" href="/api/ea/download" download>Download ONLIDagger.mq5</a>, then compile it in MetaEditor.</li><li>Allow WebRequest to this app's HTTPS origin in MT5, then attach the EA to a chart on the account you want to connect.</li><li>Set ServerURL to this app's origin and paste the PairCode. The EA reports the terminal's actual account login and broker server.</li></ol><p>The app never asks for or stores your broker password. A terminal must be running for live updates.</p></section>
    {currencies.length > 0 && <section className="fp-panel portfolio-card">{currencies.map((currency) => { const group = state.accounts.filter((account) => account.currency === currency); return <div key={currency}><span>{currency} EQUITY</span><strong>{money(group.reduce((sum, account) => sum + account.equity, 0), currency)}</strong><small>{group.length} account{group.length === 1 ? "" : "s"}</small></div> })}</section>}
  </div>
}

function csvCell(value: string | number) { return `"${String(value).replace(/"/g, '""')}"` }
function EquityLine({ rows, currency }: { rows: { day: string; net: number }[]; currency: string }) {
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day))
  let running = 0
  const values = sorted.map((row) => (running += Number(row.net)))
  const min = Math.min(0, ...values), max = Math.max(1, ...values), span = max - min || 1
  const points = values.map((value, index) => `${24 + index * (652 / Math.max(1, values.length - 1))},${176 - ((value - min) / span) * 150}`).join(" ")
  return <div className="equity-chart"><div className="equity-chart-title"><span>CUMULATIVE REALIZED P&amp;L · 30 DAYS</span><strong>{money(running, currency)}</strong></div><svg viewBox="0 0 700 205" role="img" aria-label={`Cumulative realized profit and loss chart in ${currency}`}><defs><linearGradient id="areaBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#58a6ff" stopOpacity=".28"/><stop offset="1" stopColor="#58a6ff" stopOpacity="0"/></linearGradient></defs>{[26,76,126,176].map(y=><line key={y} x1="24" x2="676" y1={y} y2={y} className="chart-grid"/>)}{values.length>1&&<><polygon points={`24,176 ${points} 676,176`} fill="url(#areaBlue)"/><polyline points={points} className="chart-line"/></>}{values.length===1&&<circle cx="350" cy="100" r="5" className="chart-point"/>}</svg><div className="equity-chart-foot"><span>{sorted[0]?.day}</span><span>{sorted.at(-1)?.day}</span></div></div>
}
function JournalPage({ state, onError }: PageProps) {
  const [search, setSearch] = useState("")
  const [account, setAccount] = useState("")
  const [page, setPage] = useState(1)
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  useEffect(() => { setNote(selected?.note || "") }, [selected?.account_id, selected?.ticket])
  const saveNote = async () => { if (!selected) return; setSavingNote(true); try { await api.saveJournalNote(selected.account_id, selected.ticket, note); setDeals((items) => items.map((deal) => deal.account_id===selected.account_id&&deal.ticket===selected.ticket?{...deal,note}:deal)); setSelected({...selected,note}) } catch(reason) { onError(reason instanceof Error ? reason.message : "Could not save note") } finally { setSavingNote(false) } }
  useEffect(() => {
    let current = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await api.journal({ page, account: account ? Number(account) : undefined, search })
        if (!current) return
        setDeals(result.deals); setTotal(result.total); setSelected((old) => result.deals.find((deal) => deal.ticket === old?.ticket) || result.deals[0] || null)
      } catch (reason) { if (current) onError(reason instanceof Error ? reason.message : "Could not load journal") }
      finally { if (current) setLoading(false) }
    }, 180)
    return () => { current = false; window.clearTimeout(timer) }
  }, [page, account, search, onError])
  const exportCsv = () => {
    const values: (string | number)[][] = [["Account", "Currency", "Ticket", "Time UTC", "Symbol", "Side", "Entry", "Volume", "Price", "Profit", "Commission", "Swap", "Fee", "Net"]]
    deals.forEach((deal) => values.push([deal.account, deal.currency, deal.ticket, new Date(deal.time * 1000).toISOString(), deal.symbol, deal.side, deal.entry, String(deal.volume), String(deal.price), String(deal.profit), String(deal.commission), String(deal.swap), String(deal.fee), String(deal.profit + deal.commission + deal.swap + deal.fee)]))
    const csv = values.map((row) => row.map(csvCell).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "mt5-journal.csv"; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="feature-page">
    <Header eyebrow="BROKER DEAL HISTORY" title="Trade journal" copy="Deals are imported from MT5 and deduplicated by broker ticket." actions={<Action className="fp-secondary" disabled={!deals.length} onClick={exportCsv}><Icon type="download" /> Export current page</Action>} />
    <div className="journal-stats"><div><span>IMPORTED DEALS</span><strong>{total}</strong><small>Matches current filters</small></div><div><span>ACCOUNTS</span><strong>{state.accounts.length}</strong><small>Linked terminals</small></div><div><span>DATA SOURCE</span><strong>MT5</strong><small>Broker history sync</small></div><div><span>PAGE</span><strong>{total ? page : "—"}</strong><small>50 deals per page</small></div></div>
    <div className="journal-layout"><section className="fp-panel journal-table-panel"><div className="fp-toolbar"><div className="fp-search"><Icon type="search" /><input aria-label="Search trades" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search symbol or ticket" value={search} /></div><select aria-label="Filter account" onChange={(event) => { setAccount(event.target.value); setPage(1) }} value={account}><option value="">All accounts</option>{state.accounts.map((item) => <option key={item.id} value={item.id}>{item.name || item.login}</option>)}</select><Action className="fp-secondary" onClick={() => setPage((old) => Math.max(1, old - 1))} disabled={page <= 1}>Previous</Action><Action className="fp-secondary" onClick={() => setPage((old) => old + 1)} disabled={page * 50 >= total}>Next</Action></div><div className="journal-table-head"><span>Deal</span><span>Account</span><span>Direction</span><span>Net result</span><span>Ticket</span></div><div className="journal-rows">{deals.map((deal) => { const net = deal.profit + deal.commission + deal.swap + deal.fee; return <button className={`journal-row ${selected?.ticket === deal.ticket ? "active" : ""}`} key={`${deal.account_id}-${deal.ticket}`} onClick={() => setSelected(deal)} type="button"><span className="journal-symbol"><i>{deal.symbol.slice(0, 2)}</i><span><strong>{deal.symbol}</strong><small>{new Date(deal.time * 1000).toLocaleString()}</small></span></span><span className="journal-setup"><strong>{deal.account}</strong><small>{deal.currency}</small></span><span className={`fp-side ${deal.side}`}>{deal.side} · {deal.entry}</span><span className={net >= 0 ? "fp-profit" : "fp-loss"}><strong>{money(net, deal.currency)}</strong></span><span>{deal.ticket}</span></button> })}{!loading && !deals.length && <Empty>{total ? "No deals match these filters." : "Your journal is empty. Connect an MT5 account to import trade history."}</Empty>}{loading && <Empty>Loading broker history…</Empty>}</div></section>
      <aside className="fp-panel trade-review"><div className="review-head"><span>DEAL DETAILS</span></div>{selected ? <><div className="review-market"><div><span>{selected.symbol.slice(0, 2)}</span><div><strong>{selected.symbol}</strong><small>{new Date(selected.time * 1000).toLocaleString()}</small></div></div><b className={(selected.profit + selected.commission + selected.swap + selected.fee) >= 0 ? "fp-profit" : "fp-loss"}>{money(selected.profit + selected.commission + selected.swap + selected.fee, selected.currency)}</b></div><div className="review-details">{[["ACCOUNT", selected.account], ["SIDE", selected.side], ["ENTRY TYPE", selected.entry], ["VOLUME", `${selected.volume} lots`], ["PRICE", String(selected.price)], ["TICKET", selected.ticket], ["ORDER", selected.order_ticket], ["POSITION", selected.position_id]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="review-note"><span>BROKER COMMENT</span><p>{selected.comment || "No broker comment"}</p></div><div className="journal-note"><label htmlFor="journal-note">YOUR TRADE NOTES</label><textarea id="journal-note" maxLength={4000} onChange={e=>setNote(e.target.value)} placeholder="What did you notice? How did you follow your plan?" value={note}/><button className="shad-button" disabled={savingNote||note===(selected.note||"")} onClick={()=>void saveNote()} type="button">{savingNote?"Saving…":"Save note"}</button></div></> : <Empty>Select a broker deal to see its details.</Empty>}</aside>
    </div>
  </div>
}

function PerformancePage({ state }: PageProps) {
  const [period, setPeriod] = useState("all")
  const metrics = period === "all" ? state.stats : state.period_stats.filter((metric) => metric.period === period)
  return <div className="feature-page"><Header eyebrow="BROKER RESULTS" title="Performance lab" copy="Metrics are calculated from imported MT5 deal history and kept separate by account currency." actions={<div className="fp-period">{[["all", "All time"], ["today", "Today"], ["week", "7 days"], ["month", "This month"]].map(([value, label]) => <Action className={period === value ? "active" : ""} key={value} onClick={() => setPeriod(value)}>{label}</Action>)}</div>} />
    {metrics.length ? <div className="currency-performance">{metrics.map((metric) => { const winRate = metric.exits ? metric.wins / metric.exits * 100 : 0; const series=state.chart.filter((row) => row.currency === metric.currency); return <section className="fp-panel currency-performance-card" key={metric.currency}><div className="section-title"><div><span>ACCOUNT CURRENCY</span><h2>{metric.currency}</h2></div></div><div className="performance-strip"><div><span>NET REALIZED P&amp;L</span><strong className={metric.net >= 0 ? "fp-profit" : "fp-loss"}>{money(metric.net, metric.currency)}</strong></div><div><span>DEALS</span><strong>{metric.deals}</strong></div><div><span>CLOSED DEALS</span><strong>{metric.exits}</strong></div><div><span>WIN RATE</span><strong>{metric.exits ? `${winRate.toFixed(1)}%` : "—"}</strong></div><div><span>AVERAGE PER EXIT</span><strong>{metric.exits ? money(metric.net / metric.exits, metric.currency) : "—"}</strong></div></div>{series.length ? <EquityLine rows={series} currency={metric.currency}/> : <Empty>No daily history in the last 30 days.</Empty>}</section> })}</div> : <section className="fp-panel performance-empty"><h2>No performance data yet</h2><p>Import MT5 deal history to see realized results by currency.</p></section>}
  </div>
}

function CopierPage({ state, onChanged, onError }: PageProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [type, setType] = useState("buy_limit")
  const [lots, setLots] = useState("0.01")
  const [entry, setEntry] = useState("")
  const [sl, setSl] = useState("")
  const [tp, setTp] = useState("")
  const [ttl, setTtl] = useState("60")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const enabledAccounts = state.accounts.filter((account) => account.enabled)
  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("")
    if (!selected.length) { setMessage("Select at least one enabled account."); return }
    if (!window.confirm(`Queue this ${type.replace("_", " ")} on ${selected.length} MT5 account(s)? It will be sent by each terminal EA before the delivery deadline.`)) return
    setBusy(true)
    try {
      const key = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const result = await api.submitOrder({ request_key: key, accounts: selected, type, lots: Number(lots), entry: Number(entry), sl: Number(sl), tp: Number(tp), ttl: Number(ttl) })
      setMessage(`Intent ${result.id} queued for ${result.targets ?? selected.length} account(s). Broker acceptance will appear as each EA reports it.`)
      await onChanged()
    } catch (reason) { const text = reason instanceof Error ? reason.message : "Order could not be queued"; setMessage(text); onError(text) }
    finally { setBusy(false) }
  }
  const stopAll = async () => {
    if (!window.confirm("Stop all bots and cancel commands that have not yet been delivered? This does not close positions or cancel orders already at a broker.")) return
    try { await api.stopAll(); setMessage("Stop request sent."); await onChanged() }
    catch (reason) { onError(reason instanceof Error ? reason.message : "Stop request failed") }
  }
  const recent = state.commands.slice(0, 20)
  return <div className="feature-page"><Header eyebrow="MT5 ORDER ROUTING" title="Trade copier" copy="Queue protected pending orders for selected accounts. Each terminal validates the order before sending it to the broker." actions={<Action className="kill-switch" onClick={() => void stopAll()}>Stop new activity</Action>} />
    <div className="copier-status-strip"><div><span className="status-orb"><Icon type="shield" /></span><span><strong>{enabledAccounts.length ? `${enabledAccounts.filter((a) => a.online).length} terminal(s) online` : "No enabled accounts"}</strong><small>EA polling and broker execution are reported per account</small></span></div><div><small>OPEN POSITIONS</small><strong>{enabledAccounts.reduce((n, a) => n + a.positions.length, 0)}</strong></div><div><small>QUEUED COMMANDS</small><strong>{state.commands.filter((c) => c.status === "queued").length}</strong></div><div><small>ACTIVE ACCOUNTS</small><strong>{enabledAccounts.length}</strong></div></div>
    <div className="copier-workspace"><section className="fp-panel route-panel"><div className="section-title"><div><span>01 · ROUTING</span><h2>Linked accounts</h2></div><Action className="fp-secondary" onClick={() => setSelected(enabledAccounts.length === selected.length ? [] : enabledAccounts.map((a) => a.id))}>{enabledAccounts.length === selected.length && enabledAccounts.length ? "Clear all" : "Select all"}</Action></div>{enabledAccounts.length ? enabledAccounts.map((account, index) => <button className={`route-account ${selected.includes(account.id) ? "active" : ""}`} key={account.id} onClick={() => toggle(account.id)} type="button"><span className={`route-avatar tone-${index % 3}`}>{(account.name || account.login).charAt(0)}</span><span><strong>{account.name || `MT5 ${account.login}`}</strong><small>{account.server} · {account.login} · {account.symbol}</small></span><span><strong>{account.currency ? money(account.equity, account.currency) : "Waiting for sync"}</strong><small>{account.online ? "Online" : "Offline; delivery waits for terminal"}</small></span><i>{selected.includes(account.id) && <Icon type="check" />}</i></button>) : <Empty>No enabled accounts are available. Link and pair an MT5 account first.</Empty>}</section>
      <section className="fp-panel ticket-panel"><div className="section-title"><div><span>02 · ORDER</span><h2>Pending order</h2></div><span className="live-price">EA VALIDATED</span></div><form onSubmit={submit}><div className="ticket-grid"><label><span>Order type</span><select onChange={(event) => setType(event.target.value)} value={type}><option value="buy_limit">Buy limit</option><option value="buy_stop">Buy stop</option><option value="sell_limit">Sell limit</option><option value="sell_stop">Sell stop</option></select></label><label><span>Fixed lots per account</span><input min="0.001" onChange={(event) => setLots(event.target.value)} required step="0.001" type="number" value={lots} /></label><label><span>Entry price</span><input min="0.000001" onChange={(event) => setEntry(event.target.value)} required step="any" type="number" value={entry} /></label><label><span>Stop loss</span><input min="0.000001" onChange={(event) => setSl(event.target.value)} required step="any" type="number" value={sl} /></label><label><span>Take profit</span><input min="0.000001" onChange={(event) => setTp(event.target.value)} required step="any" type="number" value={tp} /></label><label><span>Delivery deadline (seconds)</span><input max="3600" min="10" onChange={(event) => setTtl(event.target.value)} required type="number" value={ttl} /></label></div><p className="execution-note"><Icon type="shield" /> Orders expire if a terminal does not receive them before the deadline. Broker symbol, volume steps, price grid, margin, and stop levels are checked by the EA.</p>{message && <p className="form-feedback" role="status">{message}</p>}<button className="fp-action place-order" disabled={busy || !selected.length} type="submit">{busy ? "Queuing…" : `Queue order on ${selected.length} account(s)`} <Icon type="arrow" /></button></form></section>
    </div>
    <section className="fp-panel activity-panel"><div className="section-title"><div><span>COMMAND RECEIPTS</span><h2>Recent copier activity</h2></div></div><div className="activity-head"><span>Created</span><span>Account</span><span>Intent</span><span>Ticket</span><span>Status</span></div>{recent.length ? recent.map((command) => { let order = "Order"; try { const payload = JSON.parse(command.payload); order = `${payload.type} · ${payload.lots} lots · ${payload.symbol}` } catch { /* old rows may have invalid payload */ } return <div className="activity-row" key={command.id}><span>{new Date(command.created_at * 1000).toLocaleString()}</span><span>{command.account}</span><span>{order}</span><span>{command.ticket || "—"}</span><span><i />{command.status}{command.message ? ` · ${command.message}` : ""}</span></div> }) : <Empty>No order commands have been created.</Empty>}</section>
  </div>
}

export default function FeaturePages(props: PageProps & { page: string }) {
  if (props.page === "Trade journal") return <JournalPage {...props} />
  if (props.page === "Performance") return <PerformancePage {...props} />
  if (props.page === "Trade copier") return <CopierPage {...props} />
  return <AccountsPage {...props} />
}
