# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts, i18next
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX/tokens), Jupiter V1 Swap API, Solana RPC, Helius RPC

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Volume Bot 1 (FTRX/SOL) with Organic Mode v2
- [x] Volume Bot 2 (MMAC)
- [x] Volume Bot 3 "Bot Makk GL" - Token Pair Mode (MAKK GL <-> CRBR via DexLab)
- [x] Multi-Bot Panel: Volume, Spread, Sniper, Trade, Arbitrage, Copy Trade, Holder
- [x] Sniper Bot: Helius WebSocket real-time token sniping with TP/SL and MongoDB history
- [x] Holder Bot: Auto-generate 50-750 holders
- [x] Analytics tracking dashboard for page visits and chatbot Q&A
- [x] Direct SPL Token collection endpoint (collect-tokens)
- [x] Volume Bot Custom:1 error fix (wrapAndUnwrapSol: True, static priority fees)

## Bot Makk GL (Volume Bot 3) - Token Pair Mode
- Trades MAKK GL (4VdntG75wH1TUZMUaVL3bgbTGesLk18RbhJ7T35cmakK) <-> CRBR (BrXYiFB8zkwdp75RQvJjeXVfnhHC9Bkny3Q9N2pCrbr)
- Jupiter routing confirmed via DexLab pool
- Uses output_mint config field for pair mode activation
- BUY = swap 5-30% of MAKK GL -> CRBR
- SELL = swap 60-95% of CRBR -> MAKK GL
- Tracks both base and quote token balances per wallet
- Dashboard shows "Token Bazowy (MAKK GL)" and "Token Docelowy (CRBR)"

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina
- [ ] Przycisk "Wyslij SOL" do konkretnego sub-walleta

### P2
- [ ] Refactoring Admin.jsx (>1500 linii -> osobne komponenty)
- [ ] Persystentne logi transakcji Volume Bot w MongoDB
- [ ] Telegram/Discord webhook notyfikacje
- [ ] Fix ostrzezen kompilacji React (useCallback, Webpack)

### P3
- [ ] Encrypt private keys in MongoDB (AES) for all bot wallets
