# INSTRUKCJA - Zbuduj strone kryptowalutowa + Volume Bot dla tokena MMAC na Solana

## OPIS PROJEKTU
Zbuduj kompletna strone kryptowalutowa "MMAC" z tickerem "MMAC" na ekosystemie Solana. Strona ma zawierac landing page oraz panel admina z Volume Botem do generowania sztucznego wolumenu na DEX Raydium.

## KONFIGURACJA TOKENA
- **Nazwa**: MMAC
- **Ticker**: MMAC
- **Blockchain**: Solana (Mainnet)
- **Token Mint Address**: `EBMRVj3mBa7PsQMf39HWGBvCjhvDoqgZM5gEkaiuFray`
- **Admin Password**: `MMauto1990&`

## TECH STACK (WYMAGANY)
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, @solana/wallet-adapter (Phantom + Solflare), recharts, i18next (EN, ES, PL)
- **Backend**: FastAPI (Python), MongoDB (Motor - async), httpx, solders, base58
- **APIs**: Jupiter Swap API V1 (`api.jup.ag/swap/v1`), Solana RPC (`solana.publicnode.com`), CoinGecko (SOL price), DexScreener (MMAC price)

## ARCHITEKTURA

```
backend/
  server.py          # FastAPI + admin routes + RPC proxy + price endpoints
  volume_bot.py      # Volume Bot engine (Jupiter swap, wallet gen, batch RPC)
  .env               # MONGO_URL, DB_NAME, ADMIN_PASSWORD, SOLANA_RPC_URL

frontend/src/
  pages/Home.jsx     # Landing page
  pages/Admin.jsx    # Volume Bot admin panel
  components/        # TokenPurchase, LivePriceChart, Whitelist, WalletConnect, BuyOptions
  config/links.js    # External links (Raydium, Jupiter, Solscan, social media)
  contexts/SolanaProvider.jsx  # Solana wallet provider (RPC from env)
  locales/           # en.json, es.json, pl.json
```

---

## CZESC 1: LANDING PAGE (frontend)

### Sekcje strony glownej:
1. **Navbar**: Logo MMAC, menu (AI Services, Tokenomics, Whitelist, Roadmap, Solana), przelacznik jezyka (EN/ES/PL), przycisk "Select Wallet" (Phantom/Solflare)
2. **Hero**: Tytul, opis projektu, countdown do launchu, przyciski "Connect Wallet" i "Learn More"
3. **AI Services**: Karty z uslugami AI ktore oferuje token
4. **Tokenomics**: Wykres kolowy z dystrybucja tokenow
5. **Whitelist**: Formularz rejestracji (email + opcjonalnie wallet address) - zapisuje do MongoDB
6. **Roadmap**: Animowana os czasu z etapami rozwoju
7. **Live Price Charts**: Wykres ceny SOL (CoinGecko API) + wykres ceny MMAC (DexScreener API)
8. **Footer**: Linki social media, copyright

### Solana Wallet Connection:
- Uzyj `@solana/wallet-adapter-react` z `@solana/wallet-adapter-phantom` i `@solana/wallet-adapter-solflare`
- SolanaProvider.jsx: RPC endpoint z env var `REACT_APP_SOLANA_RPC_URL` (default: `https://solana.publicnode.com`)
- Wyswietlanie salda SOL po podlaczeniu portfela

### i18n (Wielojezycznosc):
- Uzyj `react-i18next` z plikami JSON w `locales/` (en.json, es.json, pl.json)
- Przelacznik jezyka w navbar z flagami

### SEO:
- Meta tagi Open Graph dla MMAC
- Canonical URL

---

## CZESC 2: VOLUME BOT (backend - TO NAJWAZNIEJSZA CZESC)

### Opis dzialania:
Volume Bot generuje sztuczny wolumen handlowy na Raydium DEX. Wykonuje cykle BUY/SELL tokenow MMAC za SOL uzywajac Jupiter Swap API V1. Bot uzywa wielu portfeli (130+) zeby wyglądać organicznie.

### TRYB ORGANICZNY (KRYTYCZNE - implementuj dokladnie tak):

1. **Rozne portfele dla BUY i SELL**: Cooldown zapobiega uzyciu tego samego portfela dwa razy z rzedu
2. **Gaussian random amounts**: Kazdy trade ma inna kwote (rozklad Gaussa, nie uniform) - funkcja `gauss_amount(min, max)`
3. **Partial sells**: Sprzedaz 30-80% posiadanych tokenow (nigdy 100%)
4. **Akumulacja BUY**: 2-5 transakcji BUY wymaganych zanim mozna zrobic SELL
5. **Wazona selekcja akcji**: BUY/SELL/TRANSFER_SOL/REFUND z dynamicznymi wagami:
   - BUY: waga 50 (glowna akcja)
   - SELL: waga 30 (tylko jesli buys_since_sell >= 2 i sa token holders)
   - TRANSFER_SOL: waga 10 (przenosi SOL miedzy portfelami sub)
   - REFUND: waga 10 (zbiera SOL z pustych portfeli do glownego)
6. **Inter-bot transfers**: Transfery SOL miedzy portfelami sub (nie tylko z/do glownego)

### Jupiter Swap API V1 (NIE V6!):
```
JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote"
JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap"
SOL_MINT = "So11111111111111111111111111111111111111112"
```

**BUY flow**:
1. GET quote: `JUPITER_QUOTE_URL?inputMint=SOL_MINT&outputMint=TOKEN_MINT&amount={lamports}&slippageBps={slippage}`
2. POST swap: `JUPITER_SWAP_URL` z `{ quoteResponse, userPublicKey, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: "auto" }`
3. Deserializuj transakcje, podpisz keypairem, wyslij na chain

**SELL flow**:
1. GET quote: inputMint=TOKEN_MINT, outputMint=SOL_MINT, amount={token_amount * 10^9}
2. Reszta jak BUY

### DYNAMIC SLIPPAGE (KRYTYCZNE):
Bot probuje z coraz wiekszym slippage jesli transakcja failuje:
- Proba 1: slippage_bps (z configu, np. 1500)
- Proba 2: slippage_bps + 500
- Proba 3: slippage_bps + 1000
Jesli wszystkie 3 proby failuja -> loguj error i kontynuuj

### ATA (Associated Token Account) DETECTION:
- Portfele potrzebuja ~0.00204 SOL na utworzenie ATA przy pierwszym BUY
- Rezerwa SOL: 0.005 dla portfeli BEZ ATA, 0.004 dla portfeli Z ATA
- Trackuj ktore portfele maja ATA w `_has_ata` set
- Offline ATA derivation (nie RPC call):
```python
from solders.pubkey import Pubkey
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

def get_ata(wallet_pubkey, mint_pubkey):
    ata, _bump = Pubkey.find_program_address(
        [bytes(wallet_pubkey), bytes(TOKEN_PROGRAM_ID), bytes(mint_pubkey)],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    return ata
```

### BATCH JSON-RPC (KRYTYCZNE dla 130+ portfeli):
NIE uzywaj sekwencyjnych RPC calls! Uzyj batch JSON-RPC:
```python
async def _batch_get_balances(self, pubkeys):
    """Fetch SOL balances for multiple wallets in one HTTP request (max 50 per batch)"""
    BATCH_SIZE = 50
    results = {}
    for i in range(0, len(pubkeys), BATCH_SIZE):
        batch = pubkeys[i:i+BATCH_SIZE]
        payload = [
            {"jsonrpc": "2.0", "id": idx, "method": "getBalance", "params": [pk]}
            for idx, pk in enumerate(batch)
        ]
        async with httpx.AsyncClient() as client:
            resp = await client.post(SOLANA_RPC, json=payload, timeout=15.0)
            data = resp.json()
            for item, pk in zip(data, batch):
                if "result" in item:
                    results[pk] = item["result"]["value"] / LAMPORTS_PER_SOL
    return results
```

### FTRX/MMAC Balance Fetching:
Uzyj batch `getTokenAccountBalance` z offline-derived ATA addresses:
```python
async def _batch_get_token_balances(self, pubkeys):
    """Fetch token balances using offline ATA derivation + batch RPC"""
    mint = Pubkey.from_string(self.config["token_mint"])
    ata_map = {}
    for pk in pubkeys:
        wallet_pubkey = Pubkey.from_string(pk)
        ata = get_ata(wallet_pubkey, mint)
        ata_map[str(ata)] = pk
    
    BATCH_SIZE = 50
    results = {}
    ata_list = list(ata_map.keys())
    for i in range(0, len(ata_list), BATCH_SIZE):
        batch = ata_list[i:i+BATCH_SIZE]
        payload = [
            {"jsonrpc": "2.0", "id": idx, "method": "getTokenAccountBalance", "params": [ata]}
            for idx, ata in enumerate(batch)
        ]
        async with httpx.AsyncClient() as client:
            resp = await client.post(SOLANA_RPC, json=payload, timeout=15.0)
            data = resp.json()
            for item, ata in zip(data, batch):
                wallet_pk = ata_map[ata]
                if "result" in item and item["result"]["value"]:
                    amount = float(item["result"]["value"]["uiAmount"] or 0)
                    results[wallet_pk] = amount
                    if amount > 0:
                        self._has_ata.add(wallet_pk)
    return results
```

### Konfiguracja bota (domyslna):
```python
config = {
    "token_mint": "EBMRVj3mBa7PsQMf39HWGBvCjhvDoqgZM5gEkaiuFray",
    "target_volume_sol": 10,
    "target_makers": 20,
    "trade_interval_min": 5,       # sekundy
    "trade_interval_max": 30,      # sekundy
    "min_sol_per_trade": 0.003,
    "max_sol_per_trade": 0.03,
    "slippage_bps": 1500,
    "auto_refund": True,
    "min_wallet_balance": 0.003,
}
```

### Statystyki bota (in-memory):
```python
stats = {
    "total_trades": 0, "total_volume_sol": 0.0,
    "daily_volume_sol": 0.0, "daily_makers": 0,
    "daily_trades": 0, "daily_transfers": 0,
    "cycles": 0, "errors": 0,
    "last_trade_time": None, "started_at": None, "day_start": None,
    "sol_spent_buy": 0.0, "sol_recovered_sell": 0.0,
    "net_cost": 0.0, "successful_trades": 0, "failed_trades": 0,
}
```

### Transaction log (in-memory, max 100 entries):
Kazda transakcja zapisywana jako:
```python
{"time": timestamp, "type": "BUY"/"SELL"/"TRANSFER"/"REFUND"/"ERROR", "wallet": "short_pubkey", "amount": float, "tx": "tx_signature_or_error"}
```

### Batch SOL Distribution:
- Dystrybucja SOL z glownego portfela do sub-portfeli
- Max 20 transferow per transakcja (Solana limit)
- Uzyj `solders` do budowania transakcji z wieloma instrukcjami transfer

### Collect SOL / Collect Token:
- Zbieranie SOL z sub-portfeli do glownego
- Zbieranie tokenow MMAC z sub-portfeli do glownego (uzyj Jupiter SELL)

### Wallet Generation:
- `solders.keypair.Keypair()` generuje nowy keypair
- Zapisz public_key i private_key (base58) do MongoDB `bot_wallets`
- Jeden portfel oznaczony jako `is_main: true`

### Wysylanie transakcji na chain:
```python
# WAZNE: uzyj skipPreflight=True i Confirmed commitment
async with httpx.AsyncClient() as client:
    resp = await client.post(SOLANA_RPC, json={
        "jsonrpc": "2.0", "id": 1,
        "method": "sendTransaction",
        "params": [base64_tx, {"skipPreflight": True, "preflightCommitment": "confirmed", "encoding": "base64"}]
    }, timeout=30.0)
```

---

## CZESC 3: ADMIN PANEL (frontend /admin)

### Login:
- Prosty formularz z haslem (nie email)
- Haslo weryfikowane przez backend header `x-admin-password`
- Haslo: `MMauto1990&`

### Dashboard po zalogowaniu:
1. **Status bar**: Status (Uruchomiony/Zatrzymany), Volume dzienny (X / target SOL), Makers (X / target), Trades/Transfers/Bledy
2. **Activity Chart (Recharts)**: BarChart z kolorami BUY(zielony)/SELL(czerwony)/TRANSFER(niebieski)/ERROR(szary) w czasie
3. **Kontrola Bota**: Przyciski Start/Stop
4. **Konfiguracja**: Formularz z polami: Token Mint, Target Volume, Target Makers, Przerwa min/max (sekundy), Min/Max SOL per trade, Slippage bps, Auto refund, Min saldo portfela
5. **Tryb Organiczny**: Pasek z metrykami (holders, buys since sell, last action)
6. **Efektywnosc kosztow**: SOL wydane, SOL odzyskane, koszt netto, koszt per trade, koszt per maker, success rate
7. **Kalkulator kosztow**: Szacowany koszt dzienny na podstawie konfiguracji
8. **Sekcja portfeli**:
   - Header: "Portfele (N) | X.XX SOL | Y.YY MMAC"
   - Input do dystrybucji SOL + przycisk "Rozdziel"
   - Przyciski: "Zbierz caly SOL", "Zbierz caly MMAC", "Odswiez MMAC"
   - Generowanie portfeli (input count + przycisk)
   - Dodawanie portfela recznie (label + private key)
   - Lista portfeli: label, public_key (skrocony), saldo SOL, saldo MMAC, gwiazdka (ustaw glowny), kosz (usun)
   - Glowny portfel oznaczony badge "GLOWNY"
9. **Log transakcji**: Lista ostatnich transakcji z typem, portfelem, kwota, sygnatura tx

### Jezyk panelu admina: Polski

---

## CZESC 4: BACKEND API ENDPOINTS

```
POST /api/admin/login                    # Body: { password }
GET  /api/admin/bot/status               # Header: x-admin-password
POST /api/admin/bot/start                # Header: x-admin-password
POST /api/admin/bot/stop                 # Header: x-admin-password
POST /api/admin/bot/config               # Header: x-admin-password, Body: { config fields }
GET  /api/admin/bot/costs                # Header: x-admin-password
GET  /api/admin/wallets                  # Header: x-admin-password
POST /api/admin/wallets                  # Header: x-admin-password, Body: { label, private_key }
DELETE /api/admin/wallets/{public_key}   # Header: x-admin-password
POST /api/admin/wallets/{public_key}/main # Header: x-admin-password
POST /api/admin/wallets/generate         # Header: x-admin-password, Body: { count, prefix }
POST /api/admin/wallets/distribute       # Header: x-admin-password, Body: { sol_per_wallet }
GET  /api/admin/wallets/distribute/status
POST /api/admin/wallets/collect          # Collect SOL
GET  /api/admin/wallets/collect/status
POST /api/admin/wallets/collect-mmac     # Collect MMAC tokens
GET  /api/admin/wallets/collect-mmac/status
POST /api/admin/wallets/refresh-mmac     # Refresh MMAC balances
POST /api/solana/rpc                     # RPC proxy (multi-endpoint fallback)
GET  /api/crypto/price                   # SOL price (CoinGecko, cached 60s)
GET  /api/crypto/chart                   # SOL 7-day chart (CoinGecko, cached 5min)
GET  /api/mmac/price                     # MMAC price (DexScreener)
POST /api/whitelist                      # Body: { email, wallet_address? }
GET  /api/whitelist/count
```

### Background tasks:
Distribute, Collect SOL, Collect MMAC - uruchamiaj jako `asyncio.create_task()` (nie BackgroundTasks) zeby uniknac HTTP timeout. Status sprawdzany osobnym endpointem.

---

## CZESC 5: MONGODB COLLECTIONS

```
bot_wallets: { label, public_key, private_key, is_main, added_at }
bot_config:  { _id: "main", token_mint, target_volume_sol, target_makers, trade_interval_min, trade_interval_max, min_sol_per_trade, max_sol_per_trade, slippage_bps, auto_refund, min_wallet_balance }
whitelist:   { id, email, wallet_address?, timestamp, created_at }
```

WAZNE: Zawsze wykluczaj `_id` z odpowiedzi MongoDB (`{"_id": 0}`)!

---

## CZESC 6: ENV VARS

### backend/.env:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
ADMIN_PASSWORD=MMauto1990&
SOLANA_RPC_URL=https://solana.publicnode.com
```

### frontend/.env (nie zmieniaj REACT_APP_BACKEND_URL):
```
REACT_APP_SOLANA_RPC_URL=https://solana.publicnode.com
```

---

## CZESC 7: PYTHON DEPENDENCIES (backend)

```
fastapi
uvicorn
motor
python-dotenv
httpx
pydantic
solders
base58
```

## CZESC 8: NPM DEPENDENCIES (frontend - uzyj yarn)

```
@solana/wallet-adapter-base
@solana/wallet-adapter-phantom
@solana/wallet-adapter-react
@solana/wallet-adapter-react-ui
@solana/wallet-adapter-solflare
@solana/web3.js
recharts
react-i18next
i18next
i18next-browser-languagedetector
```

---

## WAZNE UWAGI TECHNICZNE (KRYTYCZNE):

1. **NIE UZYWAJ sekwencyjnych RPC calls** dla wielu portfeli. Uzyj batch JSON-RPC (max 50 per request).
2. **Dynamic slippage**: Probuj 3 razy z rosnacym slippage zanim zaloguj blad.
3. **skipPreflight: True** przy wysylaniu transakcji na chain.
4. **ATA rent**: Rezerwuj 0.005 SOL dla nowych portfeli (bez ATA), 0.004 dla portfeli z ATA.
5. **Solana RPC** z env var, nie hardcoded. Uzyj fallback: publicnode.com -> mainnet-beta.solana.com
6. **Auto-refund NIE MOZE blokowac tradingu**: Jesli wiele pustych portfeli (>30%), kontynuuj trading zamiast refundowac.
7. **Cooldown**: Nigdy nie uzywaj tego samego portfela dwa razy z rzedu.
8. **Balance cache**: Cache balansow na 60s zeby uniknac rate limitow RPC.
9. **Frontend REACT_APP_BACKEND_URL**: Wszystkie API calls przez env var.
10. **Wygeneruj 134 portfeli** po zbudowaniu bota.

---

## KOLEJNOSC BUDOWANIA:

1. Backend: server.py z podstawowymi endpointami + MongoDB
2. Backend: volume_bot.py z pelna logika (Jupiter swap, batch RPC, organic mode)
3. Frontend: Landing page (Home.jsx) z wallet connection i i18n
4. Frontend: Admin panel (Admin.jsx) z pelnym dashboardem
5. Testuj endpointy, generuj portfele, sprawdz UI
