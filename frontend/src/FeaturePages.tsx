import { useMemo, useState, type ReactNode } from "react"

function Action({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      className={`fp-action ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function MiniIcon({
  type,
}: {
  type: "plus" | "filter" | "download" | "search" | "arrow" | "check" | "shield" | "close"
}) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8z" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="M12 2 4 5v6c0 5 3.4 9.1 8 11 4.6-1.9 8-6 8-11V5z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return (
    <svg className="fp-icon" fill="none" viewBox="0 0 24 24">
      {paths[type]}
    </svg>
  )
}

const journalTrades = [
  {
    id: 1,
    symbol: "XAUUSD",
    market: "Gold",
    date: "Jun 18, 11:42",
    setup: "London sweep",
    side: "Long",
    entry: "2,328.42",
    exit: "2,341.16",
    pnl: 637,
    r: 2.3,
    grade: "A",
    tags: ["Patient", "A+ setup"],
    note: "Waited for the liquidity sweep and entered on displacement. Clean execution with no management errors.",
  },
  {
    id: 2,
    symbol: "EURUSD",
    market: "Euro / Dollar",
    date: "Jun 18, 10:18",
    setup: "FVG continuation",
    side: "Short",
    entry: "1.08424",
    exit: "1.08198",
    pnl: 271.2,
    r: 1.6,
    grade: "B+",
    tags: ["Trend"],
    note: "Strong continuation entry. Took profit slightly early ahead of session low.",
  },
  {
    id: 3,
    symbol: "NAS100",
    market: "Nasdaq 100",
    date: "Jun 18, 09:35",
    setup: "Opening range",
    side: "Long",
    entry: "18,442.6",
    exit: "18,391.2",
    pnl: -411.2,
    r: -1,
    grade: "C",
    tags: ["FOMO", "Early"],
    note: "Entered before the range confirmed. Correct stop discipline, but the premise was rushed.",
  },
  {
    id: 4,
    symbol: "GBPJPY",
    market: "Pound / Yen",
    date: "Jun 17, 14:06",
    setup: "Break & retest",
    side: "Long",
    entry: "200.142",
    exit: "200.834",
    pnl: 176.58,
    r: 1.2,
    grade: "B",
    tags: ["Patient"],
    note: "Solid retest and controlled risk. Could have held the final partial longer.",
  },
  {
    id: 5,
    symbol: "US30",
    market: "Dow Jones",
    date: "Jun 17, 08:52",
    setup: "NY reversal",
    side: "Short",
    entry: "38,721.4",
    exit: "38,806.2",
    pnl: -254.4,
    r: -0.8,
    grade: "B-",
    tags: ["Rule-based"],
    note: "Valid setup that did not follow through. Execution was within plan.",
  },
]

function PageHeader({
  eyebrow,
  title,
  copy,
  actions,
}: {
  eyebrow: string
  title: string
  copy: string
  actions?: ReactNode
}) {
  return (
    <div className="fp-header">
      <div>
        <p className="fp-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div className="fp-header-actions">{actions}</div>
    </div>
  )
}

function NewTradeModal({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="fp-modal-backdrop">
      <div className="fp-modal">
        <div className="fp-modal-head">
          <div>
            <span>NEW JOURNAL ENTRY</span>
            <h2>Log your trade</h2>
            <p>Capture the process while it&apos;s still fresh.</p>
          </div>
          <Action className="fp-icon-button" onClick={onClose}>
            <MiniIcon type="close" />
          </Action>
        </div>
        <div className="fp-form-grid">
          <label>
            <span>Instrument</span>
            <input defaultValue="XAUUSD" />
          </label>
          <label>
            <span>Direction</span>
            <select defaultValue="Long">
              <option>Long</option>
              <option>Short</option>
            </select>
          </label>
          <label>
            <span>Entry price</span>
            <input defaultValue="2341.16" />
          </label>
          <label>
            <span>Exit price</span>
            <input placeholder="Optional" />
          </label>
          <label>
            <span>Position size</span>
            <input defaultValue="0.50" />
          </label>
          <label>
            <span>Setup</span>
            <select defaultValue="London sweep">
              <option>London sweep</option>
              <option>Break & retest</option>
              <option>Opening range</option>
            </select>
          </label>
          <label className="wide">
            <span>Trade notes</span>
            <textarea defaultValue="Price swept the Asian session low and displaced above the 5m structure..." />
          </label>
        </div>
        <div className="fp-emotion-row">
          <span>How did the trade feel?</span>
          {["Calm", "Focused", "Hesitant", "FOMO"].map((item) => (
            <Action className={item === "Focused" ? "active" : ""} key={item}>
              {item}
            </Action>
          ))}
        </div>
        <div className="fp-modal-footer">
          <Action className="fp-secondary" onClick={onClose}>
            Save as draft
          </Action>
          <Action
            className={`fp-primary ${saved ? "success" : ""}`}
            onClick={() => {
              setSaved(true)
              window.setTimeout(onClose, 900)
            }}
          >
            <MiniIcon type={saved ? "check" : "plus"} />{" "}
            {saved ? "Trade saved" : "Add to journal"}
          </Action>
        </div>
      </div>
    </div>
  )
}

function JournalPage() {
  const [filter, setFilter] = useState("All trades")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(journalTrades[0])
  const [modal, setModal] = useState(false)
  const shown = useMemo(
    () =>
      journalTrades.filter((trade) => {
        const matchSearch = `${trade.symbol} ${trade.setup}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchFilter =
          filter === "All trades" ||
          (filter === "Winners" ? trade.pnl > 0 : trade.pnl < 0)
        return matchSearch && matchFilter
      }),
    [filter, query],
  )

  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="PROCESS OVER OUTCOME"
        title="Trade journal"
        copy="Every trade is feedback. Capture it, review it, improve it."
        actions={
          <>
            <Action className="fp-secondary">
              <MiniIcon type="download" /> Export
            </Action>
            <Action className="fp-primary" onClick={() => setModal(true)}>
              <MiniIcon type="plus" /> Log new trade
            </Action>
          </>
        }
      />
      <div className="journal-stats">
        <div>
          <span>TRADES THIS MONTH</span>
          <strong>38</strong>
          <small>8 more than May</small>
        </div>
        <div>
          <span>PLAN ADHERENCE</span>
          <strong>89%</strong>
          <small className="good">+6.2% improvement</small>
        </div>
        <div>
          <span>AVERAGE GRADE</span>
          <strong>A−</strong>
          <small>Top 18% of traders</small>
        </div>
        <div className="streak">
          <span>CURRENT STREAK</span>
          <strong>
            6 <i>days</i>
          </strong>
          <small>Best: 11 days</small>
        </div>
      </div>
      <div className="journal-layout">
        <section className="fp-panel journal-table-panel">
          <div className="fp-toolbar">
            <div className="fp-search">
              <MiniIcon type="search" />
              <input
                aria-label="Search trades"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol or setup"
                value={query}
              />
            </div>
            <div className="fp-pills">
              {["All trades", "Winners", "Losses"].map((item) => (
                <Action
                  className={filter === item ? "active" : ""}
                  key={item}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </Action>
              ))}
            </div>
            <Action className="fp-filter">
              <MiniIcon type="filter" /> Filters
            </Action>
          </div>
          <div className="journal-table-head">
            <span>Trade</span>
            <span>Setup</span>
            <span>Direction</span>
            <span>Result</span>
            <span>Grade</span>
          </div>
          <div className="journal-rows">
            {shown.map((trade) => (
              <button
                className={`journal-row ${
                  selected.id === trade.id ? "active" : ""
                }`}
                key={trade.id}
                onClick={() => setSelected(trade)}
                type="button"
              >
                <span className="journal-symbol">
                  <i>{trade.symbol.slice(0, 2)}</i>
                  <span>
                    <strong>{trade.symbol}</strong>
                    <small>{trade.date}</small>
                  </span>
                </span>
                <span className="journal-setup">
                  <strong>{trade.setup}</strong>
                  <small>{trade.market}</small>
                </span>
                <span className={`fp-side ${trade.side.toLowerCase()}`}>
                  {trade.side}
                </span>
                <span className={trade.pnl > 0 ? "fp-profit" : "fp-loss"}>
                  <strong>
                    {trade.pnl > 0 ? "+" : "−"}${Math.abs(trade.pnl).toFixed(2)}
                  </strong>
                  <small>
                    {trade.r > 0 ? "+" : ""}
                    {trade.r}R
                  </small>
                </span>
                <span
                  className={`grade grade-${trade.grade.charAt(0).toLowerCase()}`}
                >
                  {trade.grade}
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="fp-panel trade-review">
          <div className="review-head">
            <span>TRADE REVIEW</span>
            <Action>•••</Action>
          </div>
          <div className="review-market">
            <div>
              <span>{selected.symbol.slice(0, 2)}</span>
              <div>
                <strong>{selected.symbol}</strong>
                <small>{selected.date}</small>
              </div>
            </div>
            <b className={selected.pnl > 0 ? "fp-profit" : "fp-loss"}>
              {selected.pnl > 0 ? "+" : "−"}${Math.abs(selected.pnl).toFixed(2)}
            </b>
          </div>
          <div className="review-chart">
            <svg viewBox="0 0 320 130" preserveAspectRatio="none">
              <path className="review-grid" d="M0 26H320M0 65H320M0 104H320" />
              <path
                className="review-candles"
                d="M8 88h8v-20H8zm25-12h8V51h-8zm25 11h8V65h-8zm25-33h8V30h-8zm25 12h8V42h-8zm25-29h8V18h-8zm25 16h8V29h-8zm25-25h8V12h-8zm25 18h8V25h-8zm25-10h8V16h-8zm25 23h8V31h-8zm25-31h8V8h-8z"
              />
              <path
                className="review-line"
                d="M0 101C32 96 41 82 68 87s40-37 67-31 46-25 72-20 49-11 113-18"
              />
            </svg>
            <span className="entry-label">ENTRY {selected.entry}</span>
            <span className="exit-label">EXIT {selected.exit}</span>
          </div>
          <div className="review-details">
            <div>
              <small>SETUP</small>
              <strong>{selected.setup}</strong>
            </div>
            <div>
              <small>R MULTIPLE</small>
              <strong>{selected.r}R</strong>
            </div>
            <div>
              <small>GRADE</small>
              <strong>{selected.grade}</strong>
            </div>
            <div>
              <small>SESSION</small>
              <strong>London</strong>
            </div>
          </div>
          <div className="review-note">
            <span>REFLECTION</span>
            <p>{selected.note}</p>
          </div>
          <div className="review-tags">
            {selected.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <Action className="fp-review-button">
            Open full review <MiniIcon type="arrow" />
          </Action>
        </aside>
      </div>
      {modal && <NewTradeModal onClose={() => setModal(false)} />}
    </div>
  )
}

function PerformancePage() {
  const [period, setPeriod] = useState("30D")
  const [metric, setMetric] = useState("Net P&L")
  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="YOUR EDGE, QUANTIFIED"
        title="Performance lab"
        copy="Understand what is working, what is costing you, and where to focus next."
        actions={
          <>
            <div className="fp-period">
              {["7D", "30D", "90D", "YTD"].map((item) => (
                <Action
                  className={period === item ? "active" : ""}
                  key={item}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </Action>
              ))}
            </div>
            <Action className="fp-secondary">
              <MiniIcon type="download" /> Report
            </Action>
          </>
        }
      />
      <div className="performance-strip">
        {[
          ["Net P&L", "+$4,286", "+12.4%"],
          ["Expectancy", "$112.80", "+$18.40"],
          ["Max drawdown", "−2.34%", "Within limit"],
          ["Sharpe ratio", "1.86", "Excellent"],
          ["Trade count", "38", "1.9 / day"],
        ].map(([label, value, detail]) => (
          <button
            className={metric === label ? "active" : ""}
            key={label}
            onClick={() => setMetric(label)}
            type="button"
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="performance-grid">
        <section className="fp-panel performance-chart">
          <div className="section-title">
            <div>
              <span>EQUITY DEVELOPMENT</span>
              <h2>{metric} over time</h2>
            </div>
            <div className="chart-legend-rich">
              <span>
                <i className="lime" /> Equity
              </span>
              <span>
                <i className="purple" /> Benchmark
              </span>
            </div>
          </div>
          <div className="big-chart">
            <div className="chart-y">
              <span>$106K</span>
              <span>$104K</span>
              <span>$102K</span>
              <span>$100K</span>
              <span>$98K</span>
            </div>
            <svg preserveAspectRatio="none" viewBox="0 0 800 280">
              <defs>
                <linearGradient id="perfArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d7ff6f" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#d7ff6f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="performance-grid-lines">
                <path d="M0 20H800M0 80H800M0 140H800M0 200H800M0 260H800" />
              </g>
              <path
                className="benchmark-line"
                d="M0 220C120 210 190 202 280 190S470 172 580 145s150-30 220-52"
              />
              <path
                className="performance-area"
                d="M0 235C35 231 46 212 80 219s62-18 96-9 61-43 98-31 64-32 99-18 69-43 102-25 61-50 98-36 65-34 104-21 63-53 123-61V280H0Z"
              />
              <path
                className="performance-line"
                d="M0 235C35 231 46 212 80 219s62-18 96-9 61-43 98-31 64-32 99-18 69-43 102-25 61-50 98-36 65-34 104-21 63-53 123-61"
              />
              <circle className="performance-dot" cx="800" cy="18" r="5" />
            </svg>
            <div className="chart-x">
              <span>May 20</span>
              <span>May 27</span>
              <span>Jun 3</span>
              <span>Jun 10</span>
              <span>Jun 18</span>
            </div>
          </div>
        </section>
        <aside className="fp-panel edge-card">
          <div className="section-title">
            <div>
              <span>EDGE SCORE</span>
              <h2>Execution quality</h2>
            </div>
            <b>86</b>
          </div>
          <div className="edge-ring">
            <div>
              <strong>86</strong>
              <small>Excellent</small>
            </div>
          </div>
          {[
            ["Entry quality", 92],
            ["Risk control", 96],
            ["Exit efficiency", 74],
            ["Plan adherence", 89],
          ].map(([label, value]) => (
            <div className="edge-row" key={label as string}>
              <span>{label}</span>
              <div>
                <i style={{ width: `${value}%` }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </aside>
      </div>
      <div className="analysis-grid">
        <section className="fp-panel analysis-card">
          <div className="section-title">
            <div>
              <span>BY SESSION</span>
              <h2>When you trade best</h2>
            </div>
          </div>
          <div className="session-bars">
            {[
              ["Asia", 38, "+$482"],
              ["London", 92, "+$2,614"],
              ["New York", 63, "+$1,190"],
            ].map(([name, width, value]) => (
              <div key={name}>
                <span>{name}</span>
                <div>
                  <i style={{ width: `${width}%` }} />
                </div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="insight-callout">
            <b>Insight</b> London open contributes 61% of total profit with your
            highest win rate.
          </p>
        </section>
        <section className="fp-panel analysis-card">
          <div className="section-title">
            <div>
              <span>BY PLAYBOOK</span>
              <h2>Strategy leaderboard</h2>
            </div>
          </div>
          <div className="strategy-list">
            {[
              ["London sweep", "74%", "+$1,862", "A"],
              ["Break & retest", "69%", "+$1,241", "A−"],
              ["FVG continuation", "62%", "+$804", "B+"],
              ["Opening range", "43%", "−$188", "C"],
            ].map(([name, rate, pnl, grade]) => (
              <div key={name}>
                <span>
                  <strong>{name}</strong>
                  <small>{rate} win rate</small>
                </span>
                <b
                  className={
                    String(pnl).startsWith("−") ? "fp-loss" : "fp-profit"
                  }
                >
                  {pnl}
                </b>
                <i>{grade}</i>
              </div>
            ))}
          </div>
        </section>
        <section className="fp-panel analysis-card">
          <div className="section-title">
            <div>
              <span>BEHAVIOR</span>
              <h2>Discipline signals</h2>
            </div>
          </div>
          <div className="behavior-list">
            <div>
              <span className="behavior-dot good" />
              <span>
                <strong>Best habit</strong>
                <small>Stops respected on 100% of trades</small>
              </span>
              <b>+12</b>
            </div>
            <div>
              <span className="behavior-dot warn" />
              <span>
                <strong>Watch closely</strong>
                <small>3 early entries after a losing trade</small>
              </span>
              <b>−6</b>
            </div>
            <div>
              <span className="behavior-dot good" />
              <span>
                <strong>Improving</strong>
                <small>Overtrading down 28% this month</small>
              </span>
              <b>+8</b>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function CopierPage() {
  const [live, setLive] = useState(true)
  const [selected, setSelected] = useState([1, 2, 3])
  const [side, setSide] = useState("Buy")
  const [type, setType] = useState("Market")
  const [placed, setPlaced] = useState(false)
  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="MULTI-ACCOUNT EXECUTION"
        title="Trade copier"
        copy="Route a single MT5 execution across every account with precise, account-aware risk."
        actions={
          <div className={`master-status ${live ? "live" : ""}`}>
            <i />
            <span>
              <small>MASTER BRIDGE</small>
              <strong>{live ? "Connected • 18ms" : "Execution paused"}</strong>
            </span>
            <button onClick={() => setLive(!live)} type="button">
              <i />
            </button>
          </div>
        }
      />
      <div className="copier-status-strip">
        <div>
          <span className="status-orb">
            <MiniIcon type="shield" />
          </span>
          <span>
            <strong>All systems operational</strong>
            <small>Last heartbeat 4 seconds ago</small>
          </span>
        </div>
        <div>
          <small>OPEN POSITIONS</small>
          <strong>4</strong>
        </div>
        <div>
          <small>TODAY&apos;S VOLUME</small>
          <strong>12.40 lots</strong>
        </div>
        <div>
          <small>AVG. SLIPPAGE</small>
          <strong>0.2 pips</strong>
        </div>
        <Action className="kill-switch">Emergency close all</Action>
      </div>
      <div className="copier-workspace">
        <section className="fp-panel route-panel">
          <div className="section-title">
            <div>
              <span>01 • ROUTING</span>
              <h2>Linked accounts</h2>
            </div>
            <Action className="fp-icon-button">
              <MiniIcon type="plus" />
            </Action>
          </div>
          <div className="route-all">
            <span>Select execution targets</span>
            <Action
              onClick={() =>
                setSelected(
                  selected.length === accounts.length ? [] : [1, 2, 3],
                )
              }
            >
              {selected.length === accounts.length ? "Clear all" : "Select all"}
            </Action>
          </div>
          {accounts.map((account, index) => {
            const checked = selected.includes(account.id)
            return (
              <button
                className={`route-account ${checked ? "active" : ""}`}
                key={account.id}
                onClick={() => toggle(account.id)}
                type="button"
              >
                <span className={`route-avatar tone-${index}`}>
                  {account.name.charAt(0)}
                </span>
                <span>
                  <strong>{account.name}</strong>
                  <small>{account.meta}</small>
                </span>
                <span>
                  <strong>{account.value}</strong>
                  <small>
                    {index === 1 ? "$247.18 daily P&L" : "$624.20 daily P&L"}
                  </small>
                </span>
                <i>{checked && <MiniIcon type="check" />}</i>
              </button>
            )
          })}
          <div className="routing-map">
            <div className="master-node">
              <i>M</i>
              <span>
                <strong>Master terminal</strong>
                <small>MT5 • 4829103</small>
              </span>
            </div>
            <div className="map-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="follower-nodes">
              {accounts.map((item, index) => (
                <span
                  className={selected.includes(item.id) ? "connected" : ""}
                  key={item.id}
                >
                  <i>{index + 1}</i>
                  {selected.includes(item.id) ? "SYNCED" : "OFF"}
                </span>
              ))}
            </div>
          </div>
        </section>
        <section className="fp-panel ticket-panel">
          <div className="section-title">
            <div>
              <span>02 • ORDER</span>
              <h2>Master ticket</h2>
            </div>
            <span className="live-price">
              <i /> LIVE
            </span>
          </div>
          <div className="instrument-select">
            <span>
              <i>Au</i>
              <span>
                <strong>XAUUSD</strong>
                <small>Gold / US Dollar</small>
              </span>
            </span>
            <b>
              2,341.16 <small>+0.42%</small>
            </b>
          </div>
          <div className="order-types">
            {["Market", "Limit", "Stop"].map((item) => (
              <Action
                className={type === item ? "active" : ""}
                key={item}
                onClick={() => setType(item)}
              >
                {item}
              </Action>
            ))}
          </div>
          <div className="side-picker">
            <Action
              className={side === "Sell" ? "sell active" : "sell"}
              onClick={() => setSide("Sell")}
            >
              <span>SELL</span>
              <strong>2,340.88</strong>
            </Action>
            <Action
              className={side === "Buy" ? "buy active" : "buy"}
              onClick={() => setSide("Buy")}
            >
              <span>BUY</span>
              <strong>2,341.16</strong>
            </Action>
          </div>
          <div className="ticket-grid">
            <label>
              <span>Risk per account</span>
              <div>
                <input defaultValue="0.75" />
                <b>%</b>
              </div>
            </label>
            <label>
              <span>Stop loss</span>
              <div>
                <input defaultValue="24" />
                <b>PIPS</b>
              </div>
            </label>
            <label>
              <span>Take profit</span>
              <div>
                <input defaultValue="55" />
                <b>PIPS</b>
              </div>
            </label>
            <label>
              <span>Max slippage</span>
              <div>
                <input defaultValue="1.5" />
                <b>PIPS</b>
              </div>
            </label>
          </div>
          <div className="order-summary">
            <div>
              <span>Estimated total size</span>
              <strong>1.42 lots</strong>
            </div>
            <div>
              <span>Combined capital at risk</span>
              <strong>$1,376.22</strong>
            </div>
            <div>
              <span>Potential profit</span>
              <strong className="fp-profit">+$3,153.84</strong>
            </div>
            <div>
              <span>Reward / risk</span>
              <strong>2.29R</strong>
            </div>
          </div>
          <Action
            className={`place-order ${placed ? "done" : ""} ${
              !live || !selected.length ? "disabled" : ""
            }`}
            onClick={() => {
              if (live && selected.length) {
                setPlaced(true)
                window.setTimeout(() => setPlaced(false), 2000)
              }
            }}
          >
            {placed ? (
              <>
                <MiniIcon type="check" /> Orders confirmed
              </>
            ) : (
              <>
                Place {side} on {selected.length} accounts{" "}
                <MiniIcon type="arrow" />
              </>
            )}
          </Action>
          <p className="execution-note">
            <MiniIcon type="shield" /> Protected by account-level drawdown and
            slippage rules
          </p>
        </section>
        <aside className="fp-panel guardrail-panel">
          <div className="section-title">
            <div>
              <span>03 • PROTECTION</span>
              <h2>Risk guardrails</h2>
            </div>
            <span className="enabled-pill">ENABLED</span>
          </div>
          {[
            ["Daily loss lock", "Stop at −2.5%", true],
            ["Equity drawdown", "Stop at −6.0%", true],
            ["News protection", "30 min before/after", true],
            ["Correlation guard", "Max 2 related pairs", true],
            ["Friday close", "Close by 20:00 UTC", false],
          ].map(([name, value, enabled]) => (
            <div className="guardrail-row" key={name as string}>
              <span>
                <strong>{name}</strong>
                <small>{value}</small>
              </span>
              <button className={enabled ? "on" : ""} type="button">
                <i />
              </button>
            </div>
          ))}
          <div className="risk-meter">
            <div>
              <span>DAILY RISK USED</span>
              <strong>32%</strong>
            </div>
            <div>
              <i />
            </div>
            <small>$824 of $2,575 available</small>
          </div>
          <Action className="fp-review-button">
            Configure all rules <MiniIcon type="arrow" />
          </Action>
        </aside>
      </div>
      <section className="fp-panel activity-panel">
        <div className="section-title">
          <div>
            <span>EXECUTION LOG</span>
            <h2>Recent copier activity</h2>
          </div>
          <Action className="fp-secondary">View all activity</Action>
        </div>
        <div className="activity-head">
          <span>Time</span>
          <span>Order</span>
          <span>Accounts</span>
          <span>Fill quality</span>
          <span>Status</span>
        </div>
        {[
          ["11:42:08", "BUY  XAUUSD • 0.50", "3 / 3", "0.1 pip", "Filled"],
          ["10:18:34", "SELL  EURUSD • 1.20", "3 / 3", "0.2 pips", "Filled"],
          ["09:35:11", "BUY  NAS100 • 0.80", "3 / 3", "0.4 pips", "Filled"],
        ].map((row) => (
          <div className="activity-row" key={row[0]}>
            {row.map((cell, index) => (
              <span key={cell}>
                {index === 4 && <i />} {cell}
              </span>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}

const accounts = [
  { id: 1, name: "Apex 100K", meta: "FTMO • 4829103", value: "$103,842" },
  { id: 2, name: "Personal", meta: "IC Markets • 7291044", value: "$28,410" },
  { id: 3, name: "Funded 50K", meta: "The5ers • 1940281", value: "$51,236" },
]

function AccountsPage() {
  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="CAPITAL OVERVIEW"
        title="Trading accounts"
        copy="Monitor balances, objectives, and connection health across your portfolio."
        actions={
          <Action className="fp-primary">
            <MiniIcon type="plus" /> Link MT5 account
          </Action>
        }
      />
      <div className="account-page-grid">
        {accounts.map((account, index) => (
          <section className="fp-panel account-page-card" key={account.id}>
            <div>
              <span className={`route-avatar tone-${index}`}>
                {account.name.charAt(0)}
              </span>
              <span>
                <strong>{account.name}</strong>
                <small>{account.meta}</small>
              </span>
              <i>CONNECTED</i>
            </div>
            <p>Current equity</p>
            <h2>
              {account.value}
              <small>.60</small>
            </h2>
            <div className="account-change">
              <span>Today</span>
              <strong>+$624.20</strong>
              <small>+0.61%</small>
            </div>
            <div className="account-goal">
              <span>
                Profit objective <b>{index === 1 ? "Personal" : "Phase 1"}</b>
              </span>
              <div>
                <i
                  style={{
                    width: `${index === 0 ? 76 : index === 1 ? 62 : 48}%`,
                  }}
                />
              </div>
              <small>
                {index === 0 ? "76%" : index === 1 ? "62%" : "48%"} complete
              </small>
            </div>
            <Action className="fp-review-button">
              Manage account <MiniIcon type="arrow" />
            </Action>
          </section>
        ))}
      </div>
      <section className="fp-panel portfolio-card">
        <div>
          <span>COMBINED EQUITY</span>
          <strong>$183,488.62</strong>
          <small>Across 3 connected terminals</small>
        </div>
        <div>
          <span>AVAILABLE MARGIN</span>
          <strong>$169,240.18</strong>
          <small>92.2% free</small>
        </div>
        <div>
          <span>OPEN RISK</span>
          <strong>$824.00</strong>
          <small>0.45% of equity</small>
        </div>
        <div>
          <span>CONNECTION HEALTH</span>
          <strong className="fp-profit">Excellent</strong>
          <small>Average latency 21ms</small>
        </div>
      </section>
    </div>
  )
}

export default function FeaturePages({ page }: { page: string }) {
  if (page === "Trade journal") return <JournalPage />
  if (page === "Performance") return <PerformancePage />
  if (page === "Trade copier") return <CopierPage />
  return <AccountsPage />
}
