# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX), Jupiter V1 Swap API, Solana RPC (publicnode.com)

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI + admin routes + RPC proxy
│   └── volume_bot.py      # Volume Bot engine (Jupiter swap, wallet gen, SOL distribution)
├── frontend/src/
│   ├── pages/Home.jsx     # Landing page
│   ├── pages/Admin.jsx    # Volume Bot admin panel
│   ├── components/        # TokenPurchase, BuyOptions, LivePriceChart, etc.
│   ├── config/links.js    # External links configuration
│   ├── locales/           # EN, ES, PL
│   └── contexts/SolanaProvider.jsx  # RPC: configurable via env
```

## Volume Bot - WORKING (Tested on Mainnet)
- [x] Jupiter V1 Swap API (`api.jup.ag/swap/v1`)
- [x] Solana RPC: configurable via SOLANA_RPC_URL env var (default: solana.publicnode.com)
- [x] BUY/SELL cycles with real transactions on Raydium
- [x] Balance-aware wallet selection (skips empty wallets)
- [x] Balance caching (60s refresh, avoids blockhash expiry)
- [x] Batch SOL distribution (20 transfers per tx)
- [x] Background task for distribute/collect (no HTTP timeout)
- [x] Phantom/Solflare wallet connection for funding
- [x] Backend RPC proxy (avoids browser CORS/403)
- [x] Auto-generate wallets, set main, distribute, collect
- [x] Cost calculator, progress bars, transaction log

## Organic Mode v2
- Different wallets for BUY and SELL (cooldown prevents same wallet consecutive trades)
- Gaussian-distributed random amounts (each trade unique)
- Partial sells: 30-80% of holdings (not 100%)
- Buy accumulation: 2-5 buys required before first sell
- Weighted action selection: BUY/SELL/TRANSFER_SOL/REFUND with dynamic weights

## Key Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/login` | POST | Admin auth |
| `/api/admin/bot/status` | GET | Bot status + config + stats |
| `/api/admin/bot/start` | POST | Start bot |
| `/api/admin/bot/stop` | POST | Stop bot |
| `/api/admin/bot/config` | POST | Update config |
| `/api/admin/bot/costs` | GET | Cost estimation |
| `/api/admin/wallets` | GET/POST | List/add wallets |
| `/api/admin/wallets/generate` | POST | Auto-generate N wallets |
| `/api/admin/wallets/distribute` | POST | Batch SOL distribution (background) |
| `/api/admin/wallets/distribute/status` | GET | Distribution progress |
| `/api/admin/wallets/collect` | POST | Collect SOL (background) |
| `/api/admin/wallets/collect/status` | GET | Collection progress |
| `/api/admin/wallets/collect-ftrx` | POST | Collect FTRX tokens |
| `/api/admin/wallets/refresh-ftrx` | POST | Refresh FTRX balances |
| `/api/admin/wallets/{pk}/main` | POST | Set main wallet |
| `/api/solana/rpc` | POST | RPC proxy (multi-endpoint fallback) |
| `/api/crypto/price` | GET | SOL price (CoinGecko cached) |
| `/api/crypto/chart` | GET | SOL 7-day chart |
| `/api/ftrx/price` | GET | FTRX price (DexScreener) |
| `/api/whitelist` | POST | Add to whitelist |
| `/api/whitelist/count` | GET | Whitelist count |

## DB Collections
- `whitelist`: `{ email, wallet_address?, timestamp }`
- `bot_wallets`: `{ label, public_key, private_key, is_main, added_at }`
- `bot_config`: `{ _id: "main", token_mint, target_volume_sol, ... }`

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Live SOL/FTRX price charts
- [x] Whitelist collection
- [x] Volume Bot with Organic Mode v2
- [x] Activity Chart (Recharts) - BUY/SELL/TRANSFER timeline
- [x] FTRX balance display + Collect FTRX + Refresh FTRX
- [x] Batch RPC optimization (134 wallets < 2s)
- [x] Dynamic slippage (500->1000->1500 bps)
- [x] ATA detection (lower SOL reserve for wallets with existing ATA)
- [x] Cost efficiency tracking dashboard
- [x] Deploy readiness: env vars for SOLANA_RPC in backend/frontend (Apr 2026)

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina
- [ ] Implementacja prawdziwej transakcji kupna tokena (TokenPurchase.jsx - obecnie mock)

### P2
- [ ] Refaktor Home.jsx (400+ linii)
- [ ] Refaktor Admin.jsx (870+ linii)
- [ ] Persystentne logi transakcji w MongoDB
- [ ] Telegram/Discord notyfikacje

### P3
- [ ] Source map warnings cleanup

### Future
- [ ] Spread Bot (Market Making)
- [ ] Arbitrage Bot
- [ ] Sniper Bot
- [ ] Copy Trade Bot
