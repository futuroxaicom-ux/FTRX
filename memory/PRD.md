# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter
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
│   ├── locales/           # EN, ES, PL
│   └── contexts/SolanaProvider.jsx  # RPC: solana.publicnode.com
```

## Volume Bot - WORKING (Tested on Mainnet)
- [x] Jupiter V1 Swap API (`api.jup.ag/swap/v1`)
- [x] Solana RPC: `solana.publicnode.com`
- [x] BUY/SELL cycles with real transactions on Raydium
- [x] Balance-aware wallet selection (skips empty wallets)
- [x] Balance caching (60s refresh, avoids blockhash expiry)
- [x] Batch SOL distribution (20 transfers per tx)
- [x] Background task for distribute/collect (no HTTP timeout)
- [x] Phantom/Solflare wallet connection for funding
- [x] Backend RPC proxy (avoids browser CORS/403)
- [x] Auto-generate wallets, set main, distribute, collect
- [x] Cost calculator, progress bars, transaction log

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
| `/api/admin/wallets/{pk}/main` | POST | Set main wallet |
| `/api/solana/rpc` | POST | RPC proxy (multi-endpoint fallback) |

## DB Collections
- `whitelist`: `{ email, wallet_address?, timestamp }`
- `bot_wallets`: `{ label, public_key, private_key, is_main, added_at }`
- `bot_config`: `{ _id: "main", token_mint, target_volume_sol, ... }`

## Tested on Mainnet (April 11, 2026)
- BUY 0.027 SOL → FTRX: tx `4XmTuAdB7fuLXc6mVYrRojG9E7idzq8EuenadzVV`
- SELL FTRX → SOL: tx `5qSHtQT7Zc3un5Vmh8YK8v8iaMwRLvgq4zacQJWd`
- 0 errors, full cycle complete

## Organic Mode v2 (Feb 2026)
- Different wallets for BUY and SELL (cooldown prevents same wallet consecutive trades)
- Gaussian-distributed random amounts (each trade unique)
- Partial sells: 30-80% of holdings (not 100%)
- Buy accumulation: 2-5 buys required before first sell
- Weighted action selection: BUY/SELL/TRANSFER_SOL/REFUND with dynamic weights
- UI: "Tryb Organiczny" bar shows live organic metrics (holders, buys since sell, last action)


## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina

### P2
- [ ] Telegram/Discord notyfikacje
- [ ] Refaktor Home.jsx (400+ linii)
- [ ] Zapis historii transakcji do MongoDB (persystentne)
- [x] Tryb "stealth" - organiczne wzorce handlowe (DONE Feb 2026 - Organic Mode v2)

### P3
- [ ] Source map warnings cleanup
