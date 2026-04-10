# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana.

## Core Concept
Landing page + Volume Bot Admin Panel dla kryptowaluty FuturoX AI z:
- Odliczaniem do uruchomienia usług AI (10 maja 2026)
- Opisem technologii AI i ich zastosowań biznesowych
- Integracją Web3 (portfele Solana)
- Wielojęzycznym wsparciem (EN, ES, PL)
- Chatbotem AI
- Volume Bot z panelem admina

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, Craco, React Router
- **Backend**: FastAPI, MongoDB (Motor), httpx
- **Web3**: Solana Wallet Adapter, Jupiter V6 API, solders
- **i18n**: react-i18next
- **3D**: @splinetool/react-spline
- **APIs**: CoinGecko (SOL price), DexScreener (FTRX price), Jupiter (swaps), Solana RPC

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI + admin routes
│   └── volume_bot.py      # Volume Bot engine (Jupiter swap)
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/
│   │   │   ├── Home.jsx   # Landing page
│   │   │   └── Admin.jsx  # Volume Bot admin panel
│   │   ├── locales/       # EN, ES, PL translations
│   │   ├── contexts/      # SolanaProvider
│   │   └── App.js         # Routes: / and /admin
│   └── public/
└── memory/
    └── PRD.md
```

## Implemented Features

### March 25, 2026 (Current Session)
- [x] **TokenPurchase Component** - Completed and tested
  - Fetches live FTRX price from `/api/ftrx/price` (DexScreener)
  - Fetches live SOL price from `/api/crypto/price` (CoinGecko)
  - Calculates real-time SOL→FTRX exchange rate
  - Opens Raydium DEX with pre-filled swap parameters
  - Full i18n support (EN/ES/PL) for all UI strings
  - data-testid attributes on all interactive elements
- [x] **Volume Bot Admin Panel** (`/admin` route)
  - Password-protected admin login (ADMIN_PASSWORD env var)
  - Dashboard: stats (status, trades, volume, errors)
  - Bot Controls: Start/Stop with real-time status
  - Configuration: Min/Max SOL, delay intervals, slippage BPS
  - Wallet Manager: Add/remove Solana wallets with balance display
  - Transaction Log: BUY/SELL/ERROR entries with Solscan links
  - Bot Engine: Jupiter V6 API for SOL↔FTRX swaps on Raydium
  - Background asyncio task for automated wash trading cycles
- [x] **i18n Improvements** - Added `purchase.swap.*` and `purchase.proTip` keys to all 3 locales
- [x] **data-testid** - Added to BuyOptions and TokenPurchase components

### Previous Sessions
- [x] Landing page with dark theme and Spline 3D animation
- [x] Solana wallet integration (Phantom, Solflare)
- [x] Multi-language system (EN, ES, PL)
- [x] Live SOL/FTRX price charts
- [x] AI Chatbot (multilingual)
- [x] Tokenomics section (70% Bonding, 20% Pool, 10% Team)
- [x] Whitelist registration (MongoDB)
- [x] Animated Roadmap
- [x] AI Banners (Neural Networks, Automation, Analytics)
- [x] BuyOptions (Direct Purchase + Raydium)
- [x] Mobile responsiveness
- [x] Social media links in footer
- [x] Custom favicons

## Key API Endpoints
- `GET /api/crypto/price` - SOL price (CoinGecko, cached 60s)
- `GET /api/crypto/chart` - SOL 7-day chart
- `GET /api/ftrx/price` - FTRX price + chart (DexScreener)
- `GET /api/solana/balance/{address}` - Wallet SOL balance
- `POST /api/whitelist` - Whitelist registration
- `GET /api/whitelist/count` - Whitelist count
- `POST /api/admin/login` - Admin login
- `GET /api/admin/bot/status` - Bot status
- `POST /api/admin/bot/start` - Start bot
- `POST /api/admin/bot/stop` - Stop bot
- `POST /api/admin/bot/config` - Update config
- `GET/POST/DELETE /api/admin/wallets` - Wallet CRUD

## DB Schema
- `whitelist`: `{ email, wallet_address?, timestamp, created_at }`
- `bot_wallets`: `{ label, public_key, private_key, added_at }`

## Testing Results (March 25, 2026)
- TokenPurchase + Landing Page: 100% pass (iteration_2)
- Volume Bot Admin Panel: 100% pass (iteration_3, 21 backend + full frontend)

## Backlog

### P1 - High Priority
- [ ] Implement actual Smart Contract transaction for direct purchase (currently opens Raydium)
- [ ] Encrypt private keys in database (currently stored as plaintext)

### P2 - Medium Priority
- [ ] Refactor Home.jsx (400+ lines) into smaller components
- [ ] Add rate limiting to admin endpoints
- [ ] Add transaction history persistence to MongoDB

### P3 - Low Priority
- [ ] Fix source map warnings from web3 dependencies
- [ ] Add more data-testid attributes to remaining components

## User Preferences
- Primary language: Polish
- Design: Dark theme with cyan (#00FFD1) accents
- Sharp-cornered buttons
- Futuristic, animated UI

## Credentials
- Admin password: Set via ADMIN_PASSWORD in backend/.env
