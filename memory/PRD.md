# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts, i18next
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX/tokens), Jupiter V1 Swap API, Solana RPC

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI + BOT_REGISTRY + generic bot endpoints
│   ├── volume_bot.py      # Volume Bot (organic mode, batch RPC)
│   ├── spread_bot.py      # Spread Bot (market making)
│   ├── sniper_bot.py      # Sniper Bot (new pool detection)
│   ├── trade_bot.py       # Trade Bot (strategies: momentum, mean_reversion, dca)
│   ├── arbitrage_bot.py   # Arbitrage Bot (cross-DEX)
│   ├── copytrade_bot.py   # Copy Trade Bot (whale following)
│   └── bot_utils.py       # Shared utilities (wallet gen, RPC, Jupiter swap)
├── frontend/src/
│   ├── pages/Home.jsx     # Landing page
│   ├── pages/Admin.jsx    # Multi-Bot admin panel (bot selector + dashboards)
│   ├── components/        # TokenPurchase, BuyOptions, LivePriceChart, etc.
│   ├── config/links.js    # External links
│   ├── locales/           # EN, ES, PL
│   └── contexts/SolanaProvider.jsx
```

## Bots Available
| Bot | Status | MongoDB Collections | Description |
|-----|--------|-------------------|-------------|
| Volume Bot | DONE | bot_wallets, bot_config | Organic volume generation |
| Spread Bot | DONE | spread_bot_wallets, spread_bot_config | Market making |
| Sniper Bot | DONE | sniper_bot_wallets, sniper_bot_config | New pool sniping |
| Trade Bot | DONE | trade_bot_wallets, trade_bot_config | Auto-trading strategies |
| Arbitrage Bot | DONE | arb_bot_wallets, arb_bot_config | Cross-DEX arbitrage |
| Copy Trade Bot | DONE | copy_bot_wallets, copy_bot_config | Whale copy trading |

## Generic Bot API Pattern
```
GET  /api/admin/bots                           # List all bots
GET  /api/admin/bot/{bot_type}/status          # Bot status + config + stats
POST /api/admin/bot/{bot_type}/start           # Start bot
POST /api/admin/bot/{bot_type}/stop            # Stop bot
POST /api/admin/bot/{bot_type}/config          # Update config
GET  /api/admin/bot/{bot_type}/wallets         # List wallets with balances
POST /api/admin/bot/{bot_type}/wallets/generate # Generate wallets
POST /api/admin/bot/{bot_type}/wallets/{pk}/main # Set main wallet
DELETE /api/admin/bot/{bot_type}/wallets/{pk}   # Remove wallet
POST /api/admin/bot/{bot_type}/wallets/distribute # Distribute SOL
POST /api/admin/bot/{bot_type}/wallets/collect   # Collect SOL
```

## Volume Bot Legacy Endpoints (still active)
| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/bot/status` | GET | Volume bot status |
| `/api/admin/bot/start` | POST | Start volume bot |
| `/api/admin/bot/stop` | POST | Stop volume bot |
| `/api/admin/wallets` | GET | Volume bot wallets |
| etc. | | |

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Live SOL/FTRX price charts
- [x] Whitelist collection
- [x] Volume Bot with Organic Mode v2 (tested on mainnet)
- [x] Activity Chart, Cost Efficiency, Batch RPC, Dynamic Slippage, ATA detection
- [x] FTRX balance bug fix - shows for ALL wallets (Apr 2026)
- [x] Multi-Bot Admin Panel - 6 bots with individual dashboards (Apr 2026)
- [x] Spread Bot, Sniper Bot, Trade Bot, Arbitrage Bot, Copy Trade Bot (Apr 2026)
- [x] Each bot with own wallets, config, Token Mint input (Apr 2026)
- [x] Deploy readiness verified (Apr 2026)

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina
- [ ] Implementacja prawdziwej transakcji kupna tokena (TokenPurchase.jsx - mock)

### P2
- [ ] Refaktor Home.jsx (400+ linii)
- [ ] Persystentne logi transakcji w MongoDB
- [ ] Telegram/Discord notyfikacje
- [ ] Docker-compose deployment script

### P3
- [ ] Source map warnings cleanup
