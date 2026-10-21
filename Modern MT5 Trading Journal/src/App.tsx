import { useState, type ReactNode } from "react"

type IconName = "home" | "book" | "copy" | "chart" | "wallet" | "settings" | "search" | "bell" | "plus" | "arrow" | "chevron" | "calendar" | "spark" | "check" | "shield" | "target" | "menu" | "close" | "dots" | "play" | "link"

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const shapes: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    book: (
      <>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 4.5v17M8 7h8M8 11h5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="3" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    chart: <path d="M4 19V9m6 10V5m6 14v-7m5 7H2" />,
    wallet: (
      <>
        <path d="M3 6.5h15a3 3 0 0 1 3 3v9H5a2 2 0 0 1-2-2z" />
        <path d="M3 7V5a2 2 0 0 1 2-2h12v3.5M16 12h5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 13.5v-3l-2-.7a6 6 0 0 0-.8-1.8l.9-1.9L15 4l-1.9.9a6 6 0 0 0-1.9-.8L10.5 2h-3l-.7 2.1A6 6 0 0 0 5 5l-2-.9L1 6.2l.9 1.9a6 6 0 0 0-.8 1.8l-2 .7v3l2 .7a6 6 0 0 0 .8 1.8L1 18l2.1 2.1 1.9-.9a6 6 0 0 0 1.8.8l.7 2h3l.7-2a6 6 0 0 0 1.9-.8l1.9.9 2.1-2.1-.9-1.9a6 6 0 0 0 .8-1.8z"
          transform="translate(2)"
        />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </>
    ),
    spark: <path d="m13 2-8 12h7l-1 8 8-12h-7z" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="M12 2 4 5v6c0 5 3.4 9.1 8 11 4.6-1.9 8-6 8-11V5z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5z" />,
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {shapes[name]}
    </svg>
  )
}

function Button({
  children,
  className = "",
  onClick,
  title,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      className={`button ${className}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

const navigation: { label: string icon: IconName }[] = [
  { label: "Command center", icon: "home" },
  { label: "Trade journal", icon: "book" },
  { label: "Trade copier", icon: "copy" },
  { label: "Performance", icon: "chart" },
  { label: "Accounts", icon: "wallet" },
]

const accounts = [
  {
    id: 1,
    name: "Apex 100K",
    meta: "FTMO • 4829103",
    value: "$103,842",
    accent: "lime",
  },
  {
    id: 2,
    name: "Personal",
    meta: "IC Markets • 7291044",
    value: "$28,410",
    accent: "violet",
  },
  {
    id: 3,
    name: "Funded 50K",
    meta: "The5ers • 1940281",
    value: "$51,236",
    accent: "orange",
  },
]

const sessions = [
  { day: "12", tone: "soft", value: "+0.4R" },
  { day: "13", tone: "win", value: "+2.1R" },
  { day: "14", tone: "loss", value: "−0.8R" },
  { day: "15", tone: "blank", value: "Rest" },
  { day: "16", tone: "win", value: "+3.4R" },
  { day: "17", tone: "soft", value: "+0.6R" },
  { day: "18", tone: "today", value: "+1.8R" },
]

const trades = [
  {
    market: "XAUUSD",
    name: "Gold / US Dollar",
    side: "LONG",
    time: "11:42",
    pnl: "+$637.00",
    r: "+2.3R",
    state: "win",
    monogram: "Au",
  },
  {
    market: "EURUSD",
    name: "Euro / US Dollar",
    side: "SHORT",
    time: "10:18",
    pnl: "+$271.20",
    r: "+1.6R",
    state: "win",
    monogram: "€",
  },
  {
    market: "NAS100",
    name: "Nasdaq 100",
    side: "LONG",
    time: "09:35",
    pnl: "−$411.20",
    r: "−1.0R",
    state: "loss",
    monogram: "NQ",
  },
]

function App() {
  const [active, setActive] = useState("Command center")
  const [menuOpen, setMenuOpen] = useState(false)
  const [copierLive, setCopierLive] = useState(true)
  const [selectedAccounts, setSelectedAccounts] = useState([1, 2, 3])
  const [mode, setMode] = useState<"Mirror lots" | "Risk sync">("Risk sync")
  const [orderSide, setOrderSide] = useState<"Buy" | "Sell">("Buy")
  const [executed, setExecuted] = useState(false)

  const selectAccount = (id: number) => {
    setSelectedAccounts((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  const execute = () => {
    if (!copierLive || !selectedAccounts.length) return
    setExecuted(true)
    window.setTimeout(() => setExecuted(false), 2200)
  }

  return (
    <div className="shell">
      <aside className={`rail ${menuOpen ? "rail-open" : ""}`}>
        <div className="logo">
          <span className="logo-symbol">
            <i />
            <i />
          </span>
          <span>Northstar</span>
        </div>
        <Button
          className="close-menu"
          onClick={() => setMenuOpen(false)}
          title="Close navigation"
        >
          <Icon name="close" />
        </Button>

        <nav className="navigation">
          <span className="nav-caption">Workspace</span>
          {navigation.map((item) => (
            <Button
              className={`nav-link ${active === item.label ? "active" : ""}`}
              key={item.label}
              onClick={() => {
                setActive(item.label)
                setMenuOpen(false)
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "Trade copier" && <i className="active-signal" />}
            </Button>
          ))}
        </nav>

        <div className="rail-footer">
          <div className="discipline-card">
            <span className="orbit">
              <Icon name="target" size={17} />
            </span>
            <span>
              <small>Discipline score</small>
              <strong>92 / 100</strong>
            </span>
            <div className="score-ring">92</div>
          </div>
          <Button className="nav-link">
            <Icon name="settings" />
            <span>Settings</span>
          </Button>
          <div className="user-card">
            <div className="avatar">AK</div>
            <span>
              <strong>Alex Knight</strong>
              <small>Professional plan</small>
            </span>
            <Icon name="dots" />
          </div>
        </div>
      </aside>

      {menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)} />
      )}

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <Button
              className="square-button menu-button"
              onClick={() => setMenuOpen(true)}
              title="Open navigation"
            >
              <Icon name="menu" />
            </Button>
            <div className="crumb">
              <span>Workspace</span>
              <Icon name="chevron" size={12} />
              <strong>{active}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="market-status">
              <i /> Markets open <span>London</span>
            </div>
            <Button className="square-button" title="Search">
              <Icon name="search" />
            </Button>
            <Button
              className="square-button notification"
              title="Notifications"
            >
              <Icon name="bell" />
            </Button>
            <Button className="profile-button">
              <span className="mini-avatar">AK</span>
              <Icon name="chevron" size={14} />
            </Button>
          </div>
        </header>

        <div className="dashboard">
          <section className="main-column">
            <div className="welcome-row">
              <div>
                <p className="overline">Tuesday, 18 June</p>
                <h1>
                  Trade the plan, <em>not the noise.</em>
                </h1>
                <p className="welcome-copy">
                  Good morning, Alex. You&apos;re 72% toward this month&apos;s
                  goal.
                </p>
              </div>
              <div className="welcome-actions">
                <Button className="ghost-button">
                  <Icon name="calendar" size={16} /> Jun 1 — Jun 18{" "}
                  <Icon name="chevron" size={13} />
                </Button>
                <Button className="light-button">
                  <Icon name="plus" size={17} /> Log a trade
                </Button>
              </div>
            </div>

            <section className="hero-card">
              <div className="hero-glow" />
              <div className="hero-summary">
                <div className="balance-label">
                  <span>Net performance</span>
                  <i>Live</i>
                </div>
                <div className="hero-number">
                  +$4,286<span>.40</span>
                </div>
                <div className="hero-change">
                  <span>
                    <Icon name="arrow" size={13} /> 12.4%
                  </span>{" "}
                  vs. previous period
                </div>
                <div className="hero-metrics">
                  <div>
                    <small>Starting balance</small>
                    <strong>$100,000</strong>
                  </div>
                  <div>
                    <small>Current equity</small>
                    <strong>$104,286</strong>
                  </div>
                  <div>
                    <small>Best day</small>
                    <strong>+$1,420</strong>
                  </div>
                </div>
              </div>
              <div className="hero-visual">
                <div className="chart-tooltip">
                  <span>Jun 16</span>
                  <strong>+$3,742</strong>
                  <small>+3.74%</small>
                </div>
                <svg preserveAspectRatio="none" viewBox="0 0 620 290">
                  <defs>
                    <linearGradient id="heroArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#d7ff6f" stopOpacity=".22" />
                      <stop offset="100%" stopColor="#d7ff6f" stopOpacity="0" />
                    </linearGradient>
                    <filter id="lineGlow">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g className="hero-grid">
                    <line x1="0" x2="620" y1="35" y2="35" />
                    <line x1="0" x2="620" y1="105" y2="105" />
                    <line x1="0" x2="620" y1="175" y2="175" />
                    <line x1="0" x2="620" y1="245" y2="245" />
                  </g>
                  <path
                    className="hero-area"
                    d="M0 246 C25 239 34 220 61 227 S98 203 126 210 S161 184 190 193 S231 168 257 178 S296 142 326 153 S365 131 394 138 S433 97 463 108 S501 72 530 83 S576 40 620 49 L620 290 L0 290Z"
                  />
                  <path
                    className="hero-line-glow"
                    d="M0 246 C25 239 34 220 61 227 S98 203 126 210 S161 184 190 193 S231 168 257 178 S296 142 326 153 S365 131 394 138 S433 97 463 108 S501 72 530 83 S576 40 620 49"
                  />
                  <line
                    className="focus-line"
                    x1="530"
                    x2="530"
                    y1="50"
                    y2="245"
                  />
                  <circle className="focus-dot" cx="530" cy="83" r="5" />
                </svg>
                <div className="chart-dates">
                  <span>May 20</span>
                  <span>May 27</span>
                  <span>Jun 03</span>
                  <span>Jun 10</span>
                  <span>Today</span>
                </div>
              </div>
            </section>

            <section className="insights-grid">
              <div className="metric-card">
                <div className="metric-head">
                  <span className="metric-icon purple">
                    <Icon name="target" />
                  </span>
                  <span className="trend positive">+4.2%</span>
                </div>
                <small>Win rate</small>
                <strong>68.4%</strong>
                <div className="progress">
                  <i style={{ width: "68.4%" }} />
                </div>
                <p>26 wins from 38 trades</p>
              </div>
              <div className="metric-card">
                <div className="metric-head">
                  <span className="metric-icon orange">
                    <Icon name="chart" />
                  </span>
                  <span className="trend positive">Healthy</span>
                </div>
                <small>Profit factor</small>
                <strong>2.18</strong>
                <div className="factor-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <p>$2.18 made per $1 lost</p>
              </div>
              <div className="metric-card">
                <div className="metric-head">
                  <span className="metric-icon blue">
                    <Icon name="spark" />
                  </span>
                  <span className="trend positive">+0.26R</span>
                </div>
                <small>Avg. R multiple</small>
                <strong>1.84R</strong>
                <div className="r-scale">
                  <i />
                  <i />
                  <i className="active" />
                  <i />
                  <i />
                </div>
                <p>Edge improving steadily</p>
              </div>
            </section>

            <section className="week-card">
              <div className="section-heading">
                <div>
                  <h2>Your trading rhythm</h2>
                  <p>Consistency over the last seven sessions</p>
                </div>
                <Button className="inline-button">
                  Open calendar <Icon name="arrow" size={14} />
                </Button>
              </div>
              <div className="session-strip">
                {sessions.map((session, index) => (
                  <div className={`session ${session.tone}`} key={session.day}>
                    <span>
                      {index === 6
                        ? "Today"
                        : ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon"][index]}
                    </span>
                    <strong>{session.day}</strong>
                    <small>{session.value}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="trades-card">
              <div className="section-heading">
                <div>
                  <h2>Recent executions</h2>
                  <p>Review the story behind every position</p>
                </div>
                <Button className="inline-button">
                  Full journal <Icon name="arrow" size={14} />
                </Button>
              </div>
              <div className="trade-list">
                {trades.map((trade) => (
                  <div className="trade-item" key={trade.market}>
                    <span className={`market-icon ${trade.state}`}>
                      {trade.monogram}
                    </span>
                    <span className="market-name">
                      <strong>{trade.market}</strong>
                      <small>{trade.name}</small>
                    </span>
                    <span className={`direction ${trade.side.toLowerCase()}`}>
                      {trade.side}
                    </span>
                    <span className="trade-time">
                      <small>Closed</small>
                      <strong>{trade.time}</strong>
                    </span>
                    <span className={`trade-return ${trade.state}`}>
                      <strong>{trade.pnl}</strong>
                      <small>{trade.r}</small>
                    </span>
                    <Button className="row-action">
                      <Icon name="chevron" size={15} />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="copier-column">
            <section className="copier-card">
              <div className="copier-head">
                <div>
                  <span className="copier-kicker">
                    <i /> MT5 COPIER
                  </span>
                  <h2>Execution desk</h2>
                  <p>One idea. Every account.</p>
                </div>
                <button
                  aria-label="Toggle copier"
                  aria-pressed={copierLive}
                  className={`switch ${copierLive ? "on" : ""}`}
                  onClick={() => setCopierLive(!copierLive)}
                  type="button"
                >
                  <i />
                </button>
              </div>

              <div className={`connection ${copierLive ? "" : "paused"}`}>
                <span className="connection-icon">
                  <Icon name={copierLive ? "spark" : "shield"} size={15} />
                </span>
                <div>
                  <strong>
                    {copierLive ? "Bridge connected" : "Execution paused"}
                  </strong>
                  <small>
                    {copierLive
                      ? "Frankfurt VPS • 18ms latency"
                      : "Enable to send new orders"}
                  </small>
                </div>
                <span className="latency">
                  {copierLive ? "OPTIMAL" : "OFFLINE"}
                </span>
              </div>

              <div className="copier-section">
                <div className="label-row">
                  <span>Route to accounts</span>
                  <strong>{selectedAccounts.length} selected</strong>
                </div>
                <div className="account-stack">
                  {accounts.map((account) => {
                    const checked = selectedAccounts.includes(account.id)
                    return (
                      <button
                        className={`account-row ${checked ? "checked" : ""}`}
                        key={account.id}
                        onClick={() => selectAccount(account.id)}
                        type="button"
                      >
                        <span className={`account-avatar ${account.accent}`}>
                          {account.name.charAt(0)}
                        </span>
                        <span className="account-details">
                          <strong>{account.name}</strong>
                          <small>{account.meta}</small>
                        </span>
                        <span className="account-value">
                          <strong>{account.value}</strong>
                          <i>{checked && <Icon name="check" size={11} />}</i>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <Button className="link-button">
                  <Icon name="link" size={14} /> Link another MT5 account
                </Button>
              </div>

              <div className="copier-section order-section">
                <div className="label-row">
                  <span>Quick order</span>
                  <span className="symbol-live">
                    <i /> XAUUSD
                  </span>
                </div>
                <div className="quote">
                  <div>
                    <small>Gold / US Dollar</small>
                    <strong>2,341.16</strong>
                  </div>
                  <span>+0.42%</span>
                </div>
                <div className="buy-sell">
                  <Button
                    className={orderSide === "Buy" ? "buy active" : "buy"}
                    onClick={() => setOrderSide("Buy")}
                  >
                    <span>BUY</span>
                    <strong>2,341.16</strong>
                  </Button>
                  <Button
                    className={orderSide === "Sell" ? "sell active" : "sell"}
                    onClick={() => setOrderSide("Sell")}
                  >
                    <span>SELL</span>
                    <strong>2,340.88</strong>
                  </Button>
                </div>
              </div>

              <div className="copier-section risk-section">
                <div className="label-row">
                  <span>Position sizing</span>
                  <Icon name="shield" size={14} />
                </div>
                <div className="mode-tabs">
                  {(["Mirror lots", "Risk sync"] as const).map((item) => (
                    <Button
                      className={mode === item ? "active" : ""}
                      key={item}
                      onClick={() => setMode(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
                <div className="risk-fields">
                  <div>
                    <small>
                      {mode === "Risk sync"
                        ? "Risk per account"
                        : "Fixed lot size"}
                    </small>
                    <strong>
                      {mode === "Risk sync" ? "0.75" : "0.50"}
                      <span>{mode === "Risk sync" ? "%" : " LOT"}</span>
                    </strong>
                  </div>
                  <div>
                    <small>Stop loss</small>
                    <strong>
                      24<span> PIPS</span>
                    </strong>
                  </div>
                </div>
                <div className="exposure">
                  <span>Combined risk</span>
                  <strong>$1,376.22</strong>
                  <i>within limits</i>
                </div>
              </div>

              <div className="execution">
                <div className="guard">
                  <Icon name="shield" size={14} />
                  <span>
                    <strong>Guardrails active</strong>
                    <small>Max loss, slippage & news protection</small>
                  </span>
                </div>
                <Button
                  className={`execute ${executed ? "executed" : ""} ${
                    !copierLive || !selectedAccounts.length ? "disabled" : ""
                  }`}
                  onClick={execute}
                >
                  {executed ? (
                    <>
                      <Icon name="check" /> Orders received
                    </>
                  ) : (
                    <>
                      <span className="play-icon">
                        <Icon name="play" size={14} />
                      </span>{" "}
                      Execute {orderSide} on {selectedAccounts.length} accounts{" "}
                      <Icon name="arrow" size={15} />
                    </>
                  )}
                </Button>
                <p>Hold to execute • MT5 market order</p>
              </div>
            </section>

            <section className="note-card">
              <div>
                <span className="note-icon">“</span>
                <strong>Today&apos;s intention</strong>
              </div>
              <p>
                Wait for confirmation. Size down after a loss. The best trade
                may be no trade.
              </p>
              <Button>
                <Icon name="book" size={14} /> Edit daily plan
              </Button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default App
