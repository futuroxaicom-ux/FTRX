# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot.

## Core Concept
Landing page + Volume Bot Admin Panel dla kryptowaluty FuturoX AI z:
- Wielojęzycznym wsparciem (EN, ES, PL)
- Integracją Web3 (portfele Solana)
- Live cenami SOL/FTRX
- Volume Bot z wash tradingiem na Raydium via Jupiter

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router
- **Backend**: FastAPI, MongoDB (Motor), httpx
- **Web3**: Solana Wallet Adapter, Jupiter V6 API, solders, base58
- **i18n**: react-i18next
- **APIs**: CoinGecko (SOL), DexScreener (FTRX), Jupiter (swaps), Solana RPC

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI + admin routes
│   └── volume_bot.py      # Volume Bot engine (Jupiter swap, wallet gen, SOL distribution)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx   # Landing page
│   │   │   └── Admin.jsx  # Volume Bot admin panel
│   │   ├── components/    # TokenPurchase, BuyOptions, LivePriceChart, etc.
│   │   ├── locales/       # EN, ES, PL translations
│   │   └── contexts/      # SolanaProvider
│   └── public/
└── memory/PRD.md
```

## Implemented Features

### Volume Bot Admin Panel (`/admin`)
- [x] Password-protected login
- [x] **Token Mint Address** - editable field for any Solana token
- [x] **Target Volume** (SOL/day) with progress bar
- [x] **Target Makers** (/day) with progress bar
- [x] **Trade Interval** (min-max minutes)
- [x] **Min/Max SOL per trade**
- [x] **Slippage** (basis points)
- [x] **Cost Calculator** - auto-calculates: trades/day, gas fees, slippage cost, total daily cost, min SOL needed
- [x] **Auto-generate wallets** - creates N Solana keypairs with one click
- [x] **Main wallet** - mark one wallet as "main" for distribution
- [x] **Distribute SOL** - sends SOL from main wallet to all sub-wallets
- [x] **Collect SOL** - collects SOL from all sub-wallets back to main
- [x] **Manual wallet add** - paste private key (base58 or JSON array)
- [x] **Wallet list** with balances, main badge, delete
- [x] **Transaction Log** with BUY/SELL/ERROR + Solscan links
- [x] **Bot Controls** - Start/Stop with uptime, cycles, last trade info
- [x] Bot engine: Jupiter V6 API for SOL↔Token swaps on Raydium
- [x] Daily target tracking with auto-reset after 24h
- [x] Maker diversity: prioritizes unused wallets

### Landing Page
- [x] Multi-language (EN/ES/PL)
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Live SOL/FTRX price charts
- [x] TokenPurchase (direct buy via Raydium)
- [x] AI Chatbot
- [x] Tokenomics (70% Bonding, 20% Pool, 10% Team)
- [x] Whitelist registration (MongoDB)
- [x] Animated Roadmap
- [x] Social media links, custom favicons
- [x] Mobile responsiveness

## Key API Endpoints
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
| `/api/admin/wallets/distribute` | POST | Send SOL to sub-wallets |
| `/api/admin/wallets/collect` | POST | Collect SOL from sub-wallets |
| `/api/admin/wallets/{pk}/main` | POST | Set main wallet |
| `/api/admin/wallets/{pk}` | DELETE | Remove wallet |
| `/api/crypto/price` | GET | SOL price (CoinGecko) |
| `/api/ftrx/price` | GET | FTRX price (DexScreener) |
| `/api/whitelist` | POST | Whitelist registration |

## DB Collections
- `whitelist`: `{ email, wallet_address?, timestamp, created_at }`
- `bot_wallets`: `{ label, public_key, private_key, is_main, added_at }`
- `bot_config`: `{ _id: "main", token_mint, target_volume_sol, ... }`

## Testing
- iteration_2: TokenPurchase + Landing - 100% pass
- iteration_3: Basic admin panel - 21/21 backend 100%
- iteration_4: Enhanced admin panel - 25/25 backend 100%, full frontend pass

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB
- [ ] Rate limiting na endpointach admina

### P2
- [ ] Refaktor Home.jsx (400+ linii)
- [ ] Telegram/Discord notyfikacje z bota
- [ ] Zapis historii transakcji do MongoDB

### P3
- [ ] Source map warnings cleanup
