export type Position = {
  ticket: string
  symbol: string
  side: string
  volume: number
  price: number
  profit: number
}

export type Account = {
  id: number
  name: string
  login: string
  server: string
  symbol: string
  enabled: number
  currency: string
  balance: number
  equity: number
  floating: number
  margin: number
  last_seen: number | null
  trade_allowed: number
  mode: string
  positions: Position[]
  bot_applied: number
  bot_message: string
  version: number
  desired: string
  config: Record<string, number> | null
  online: boolean
}

export type Deal = {
  account_id: number
  account: string
  currency: string
  ticket: string
  order_ticket: string
  position_id: string
  symbol: string
  side: string
  entry: string
  volume: number
  price: number
  profit: number
  commission: number
  swap: number
  fee: number
  magic: string
  time: number
  comment: string
  note: string
}

export type Command = {
  id: number
  account_id: number
  account: string
  payload: string
  status: string
  ticket: string
  message: string
  created_at: number
  updated_at: number
}

export type Metric = {
  currency: string
  deals: number
  net: number
  exits: number
  wins: number
}

export type AppState = {
  accounts: Account[]
  stats: Metric[]
  account_stats: (Metric & { account_id: number })[]
  period_stats: (Metric & { period: string })[]
  account_period_stats: (Metric & { account_id: number; period: string })[]
  chart: { currency: string; day: string; net: number }[]
  account_chart: { account_id: number; currency: string; day: string; net: number }[]
  commands: Command[]
  pairings: { id: number; label: string; symbol: string; status: string; expires_at: number }[]
  server_time: number
}

let csrfToken: string | undefined

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("Content-Type", "application/json")
  if (init.method && init.method !== "GET") {
    csrfToken ??= (await request<{ csrf: string }>("/api/session")).csrf
    headers.set("X-CSRF-Token", csrfToken)
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" })
  const text = await response.text()
  let result: unknown = {}
  if (text) {
    try {
      result = JSON.parse(text)
    } catch {
      result = text
    }
  }
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result
      ? String((result as { error: unknown }).error)
      : `Request failed (${response.status})`
    throw new Error(message)
  }
  return result as T
}

export const api = {
  state: () => request<AppState>("/api/state"),
  journal: (params: { page?: number; account?: number; search?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.account) query.set("account", String(params.account))
    if (params.search) query.set("search", params.search)
    return request<{ deals: Deal[]; total: number; page: number }>(`/api/journal?${query}`)
  },
  saveJournalNote: (account: number, ticket: string, note: string) =>
    request<{ ok: boolean; note: string }>(`/api/journal/${account}/${ticket}/note`, { method: "POST", body: JSON.stringify({ note }) }),
  createPairing: (name: string, symbol: string) =>
    request<{ id: number; code: string; expires_at: number; symbol: string }>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ name, symbol }),
    }),
  rotateAccount: (id: number) =>
    request<{ ok: boolean; token: string }>(`/api/accounts/${id}/rotate`, { method: "POST", body: "{}" }),
  revokeAccount: (id: number) =>
    request<{ ok: boolean }>(`/api/accounts/${id}/revoke`, { method: "POST", body: "{}" }),
  submitOrder: (body: Record<string, unknown>) =>
    request<{ id: number; targets?: number; duplicate?: boolean }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  stopAll: () => request<{ ok: boolean }>("/api/stop", { method: "POST", body: "{}" }),
}
