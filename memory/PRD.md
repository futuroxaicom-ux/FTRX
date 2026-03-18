# FuturoX AI - Product Requirements Document

## Original Problem Statement
Użytkownik chce zbudować stronę kryptowalutową o nazwie "FuturoX AI" z tickerem "FTRX", opartą na ekosystemie Solana.

## Core Concept
Landing page dla kryptowaluty FuturoX AI z:
- Odliczaniem do uruchomienia usług AI (10 maja 2026)
- Opisem technologii AI i ich zastosowań biznesowych
- Integracją Web3 (portfele Solana)
- Wielojęzycznym wsparciem (EN, ES, PL)
- Chatbotem AI

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, Craco (polyfills webpack)
- **Backend**: FastAPI, MongoDB (Motor)
- **Web3**: Solana Wallet Adapter
- **i18n**: react-i18next
- **3D**: @splinetool/react-spline
- **APIs**: CoinGecko (ceny)

## Implemented Features

### March 18, 2026
- [x] **Multilingual Chatbot Fix** - Naprawiono chatbot aby odpowiadał w wybranym języku (EN, ES, PL)
  - Dodano state `currentLang` do śledzenia aktualnego języka
  - Chatbot automatycznie czyści historię przy zmianie języka
  - Quick replies i powitania w odpowiednim języku
- [x] **Animated AI Banners** - 3 animowane banery między sekcjami:
  - AIBannerBrain (Neural Networks) - między Hero a AI Services
  - AIBannerAutomation (Process Automation) - między AI Services a Pre-order
  - AIBannerAnalytics (Predictive Analytics) - między Pre-order a Solana
- [x] **ESLint Warning Fix** - Naprawiono ostrzeżenie o brakującej zależności `fetchBalance` w WalletConnect.jsx

### Previous Work
- [x] Landing page z ciemnym motywem i animacją 3D Spline
- [x] Integracja portfeli Solana (Phantom, Solflare)
- [x] System wielojęzyczny (EN, ES, PL)
- [x] Wykres ceny SOL w czasie rzeczywistym
- [x] Modal informacyjny o Solana
- [x] Usunięcie badge'a "Made with Emergent"
- [x] Opcje zakupu (Direct Purchase / Raydium)

## Architecture

```
/app
├── backend/
│   └── server.py
├── frontend/
│   ├── craco.config.js          # Webpack polyfills dla Web3
│   └── src/
│       ├── components/
│       │   ├── AIBanner.jsx     # NEW: 3 animowane banery AI
│       │   ├── BuyOptions.jsx
│       │   ├── ChatBot.jsx      # FIXED: wielojęzyczny chatbot
│       │   ├── LanguageSwitcher.jsx
│       │   ├── LivePriceChart.jsx
│       │   ├── SolanaInfoModal.jsx
│       │   ├── TokenPurchase.jsx
│       │   └── WalletConnect.jsx  # FIXED: ESLint warning
│       ├── config/
│       │   └── links.js
│       ├── contexts/
│       │   └── SolanaProvider.jsx
│       ├── locales/
│       │   ├── en.json          # UPDATED: banner translations
│       │   ├── es.json          # UPDATED: banner translations
│       │   └── pl.json          # UPDATED: banner translations
│       ├── pages/
│       │   └── Home.jsx         # UPDATED: AI banners added
│       └── utils/
│           └── chatKnowledge.js # Knowledge base EN/ES/PL
└── memory/
    └── PRD.md
```

## Testing Results (March 18, 2026)
- **English Chatbot**: PASS
- **Polish Chatbot**: PASS
- **AI Banners**: PASS (all 3 visible)
- **Spanish Chatbot**: Not tested (timeout issues with Spline animation)
- **Success Rate**: 75%

## Backlog (Prioritized)

### P1 - High Priority
- [ ] Update Raydium link when user provides real URL
- [ ] Proxy CoinGecko API through backend to fix CORS issues

### P2 - Medium Priority
- [ ] Enable FTRX price chart when token listed on CoinGecko
- [ ] Implement backend for "Direct Purchase" feature
- [ ] Fix language switcher click timeout (Spline animation blocking)

### P3 - Low Priority
- [ ] Refactor Home.jsx (400+ lines) into smaller components
- [ ] Fix source map warnings from @reown/appkit
- [ ] Add data-testid attributes to all interactive elements

## Known Issues
1. Language switcher clicks timeout after 30s - likely due to Spline 3D animation blocking interactions
2. CORS warning with CoinGecko API (low priority)
3. Multiple source map warnings from node_modules (cosmetic)

## Configuration Files
- `/app/frontend/src/config/links.js` - Token address, Raydium link placeholders
- `/app/RAYDIUM_SETUP.md` - Instructions for updating Raydium link
- `/app/PRICE_CHART_SETUP.md` - Instructions for enabling FTRX chart

## User Preferences
- Primary language: Polish
- Design: Dark theme with cyan (#00FFD1) accents
- Sharp-cornered buttons
- Futuristic, animated UI
