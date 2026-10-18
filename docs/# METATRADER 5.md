# METATRADER 5

App NAME - ONLIDagger MT5 Manager

Components

- JOURNAL - Automatically keeeps track of all trades, Automatically connects to linked accounts via EA
- Trade Copier - Automatically places trades to all linked accounts. FOr example, Buy Limits, But Stops, Sell limits/stops placed in the dashboard are automatically scheduled on all linked acccounts instantly. One placement, all MT5 accounts. Should be very effective and not produce any mistakes.
- Automatic Trading Bot - Tailored for XAGUSD, when started, it takes short trades. When the bot is selected and started, it automatically sends a start signal to the target account (selected by the user) to start placing trades and report the number of trades taken, profit and loss metrics. This should be the best inclass, one and only bot that should be highly profitable, strictly tailored for the M1 timeframe.


TARGET ARCH: 

Base main server: Ubuntu with Nginx/PHP-FPM/SQLITE3 DB
MT5: Listens and Pushes data directly to the main server in realtime as long as its reachable.
MT5 Bot: Listens for placement data from the dashboard, include key entry levels, lot sizing, and maximum positions to take.