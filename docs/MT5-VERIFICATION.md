# MT5 verification checklist

The PHP test suite simulates the EA protocol. It cannot compile MQL5 or reproduce a real broker's execution engine. Complete the following on the intended broker before using real funds.

1. Compile `backend/mt5/ONLIDagger.mq5` with the current MetaEditor, resolve any compiler diagnostics, and attach it to the broker's XAGUSD M1 chart on a demo account.
2. Create a dashboard PairCode, configure `ServerURL` and `PairCode`, and verify the EA claims the code using the terminal's real login/server. Check connection state, balances and history totals against MT5. Revoke or rotate the credential and verify the old token fails.
3. For each of buy limit, buy stop, sell limit and sell stop, send a valid order with broker-compatible volume/tick sizes. Confirm acceptance, SL/TP, ticket and later fill/cancellation status. Test invalid volume steps, quote-side placement, insufficient margin and disabled Algo Trading.
4. Submit identical HTTP requests with the same request key. Verify one intent and one order per target. Test a lost sync response, a lost receipt acknowledgement, restart after marker persistence and terminal migration. Ambiguous outcomes must remain unknown without resubmission.
5. Verify the journal after partial fills, commission/swap charges, reconnect and two currencies. Tickets must remain exact strings even above JavaScript's safe-integer range. Compare realized P/L after the history import completes.
6. In Strategy Tester select **Every tick based on real ticks**, the exact broker symbol, M1 and realistic execution delay. Use `Tester*` inputs; HTTP is bypassed. Evaluate different periods, out-of-sample data and stress scenarios. No backtest result is bundled or claimed.
7. On demo, start the bot from the dashboard. Verify the applied configuration version and each risk gate, including netting-account behavior. Stop the bot, disconnect the server for over 15 seconds, and let a run expire. Verify no additional entries while broker exits remain in place.
8. Test unknown bot submission outcomes. The persistent uncertainty marker must block new entries until a matching broker position/deal is found; manual repair requires broker reconciliation.
9. Confirm that stop-all cancels only queued commands and stops new bot entries. Close positions or cancel previously accepted pending orders explicitly in MT5.

The sell-only strategy is deterministic and configurable; its profitability is unverified. Choose performance/drawdown acceptance thresholds before optimization and forward-test on demo.

Primary references: [WebRequest](https://www.mql5.com/en/docs/network/webrequest), [OrderSend](https://www.mql5.com/en/docs/trading/ordersend), [OnTradeTransaction](https://www.mql5.com/en/docs/event_handlers/ontradetransaction).
