import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Wallet, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast, Toaster } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';
const DEPOSIT_ADDRESS = 'CCBLgadVU7orDytcaffTTznsT58xXQ4gN8p8Xtn5tKP2';

export default function DeclarationPage() {
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [walletV2, setWalletV2] = useState('');
  const [checks, setChecks] = useState({
    responsibility: false,
    owner: false,
    noEarlySale: false,
    purexchange: false,
    cryptobridge: false,
    dex: false,
  });

  useEffect(() => {
    fetch(`${API}/api/declaration/${id}/check`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) {
          setInfo(d);
          if (d.already_submitted) setAlreadyDone(true);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const copyAddress = () => {
    navigator.clipboard.writeText(DEPOSIT_ADDRESS);
    toast.success('Adres skopiowany do schowka');
  };

  const allChecked = Object.values(checks).every(Boolean);

  const handleSubmit = async () => {
    if (!walletV2) { toast.error('Podaj adres portfela dla FTRX V2'); return; }
    if (!walletV2.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) { toast.error('Podaj poprawny adres portfela Solana'); return; }
    if (!allChecked) { toast.error('Zaznacz wszystkie wymagane pola'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/declaration/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_v2: walletV2,
          confirmed_responsibility: checks.responsibility,
          confirmed_owner: checks.owner,
          confirmed_no_early_sale: checks.noEarlySale,
          confirmed_purexchange: checks.purexchange,
          confirmed_cryptobridge: checks.cryptobridge,
          confirmed_dex: checks.dex,
        }),
      });
      const d = await r.json();
      if (d.success) { setSubmitted(true); }
      else { toast.error(d.detail || 'Błąd. Spróbuj ponownie.'); }
    } catch { toast.error('Błąd połączenia z serwerem'); }
    setSubmitting(false);
  };

  const Check = ({ id: cid, label, sublabel }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => setChecks(prev => ({ ...prev, [cid]: !prev[cid] }))}
        className={`mt-0.5 w-5 h-5 shrink-0 border-2 rounded flex items-center justify-center transition-all cursor-pointer ${checks[cid] ? 'bg-[#00FFD1] border-[#00FFD1]' : 'border-[rgba(255,255,255,0.2)] group-hover:border-[#00FFD1]/50'}`}
      >
        {checks[cid] && <CheckCircle className="w-3.5 h-3.5 text-black" />}
      </div>
      <div onClick={() => setChecks(prev => ({ ...prev, [cid]: !prev[cid] }))}>
        <p className="text-sm text-white leading-snug">{label}</p>
        {sublabel && <p className="text-xs text-[#666] mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-[#FFD700] animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400" />
      <h1 className="text-2xl font-bold">Nieprawidłowy link oświadczenia</h1>
      <p className="text-[#666] max-w-sm">Ten link jest nieważny lub wygasł. Sprawdź e-mail z instrukcjami migracji.</p>
      <a href="/" className="mt-4 text-[#00FFD1] hover:underline text-sm">Wróć do strony głównej</a>
    </div>
  );

  if (alreadyDone || submitted) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-16 h-16 bg-[#00FFD1]/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-[#00FFD1]" />
      </div>
      <h1 className="text-2xl font-bold">Oświadczenie złożone</h1>
      <p className="text-[#888] max-w-sm">Twoje oświadczenie migracyjne zostało już złożone. Tokeny FTRX v2 zostaną przesłane po weryfikacji transakcji.</p>
      <a href="/" className="mt-4 text-[#00FFD1] hover:underline text-sm">Strona główna FuturoX AI</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster />

      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] px-4 md:px-8 py-4">
        <div className="max-w-[800px] mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px]">FTRX</div>
          <span className="text-lg font-bold">FuturoX AI</span>
          <span className="text-[#444] mx-2">·</span>
          <span className="text-sm text-[#666]">Oświadczenie migracyjne</span>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 py-10 space-y-8">

        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full">
            <Shield className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-medium text-[#FFD700]">Elektroniczne oświadczenie migracyjne</span>
          </div>
          <h1 className="text-3xl font-black">Migracja FTRX <span className="text-[#FFD700]">V1</span> → <span className="text-[#00FFD1]">V2</span></h1>
          <p className="text-[#888] text-sm">Indywidualny formularz dla: <span className="text-[#00FFD1] font-medium">{info?.email}</span></p>
        </div>

        {/* Steps nav */}
        <div className="flex items-center gap-2 justify-center">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-[#00FFD1] text-black' : 'bg-[#1a1a1a] text-[#555] border border-[#333]'}`}>{s}</div>
              {s < 3 && <div className={`h-px w-12 transition-all ${step > s ? 'bg-[#00FFD1]' : 'bg-[#222]'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Deposit */}
        {step === 1 && (
          <Card className="bg-[#0a0a0a] border-[#00FFD1]/20]">
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs text-[#00FFD1] font-bold uppercase tracking-wider mb-1">Krok 1</p>
                <h2 className="text-xl font-bold">Depozyt FTRX V1</h2>
                <p className="text-sm text-[#888] mt-2 leading-relaxed">
                  Prześlij posiadaną ilość tokenów FTRX (V1) na poniższy oficjalny adres depozytowy projektu. Migracja odbywa się w stosunku <strong className="text-white">1:1</strong> — każdy FTRX V1 = jeden FTRX V2.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#666] uppercase tracking-wide">Oficjalny adres depozytowy FTRX V1</p>
                <div className="flex items-center gap-3 p-4 bg-black border border-[#00FFD1]/30 rounded">
                  <p className="font-mono text-sm text-[#00FFD1] break-all flex-1">{DEPOSIT_ADDRESS}</p>
                  <button onClick={copyAddress} className="shrink-0 p-2 hover:bg-white/5 rounded transition-colors" title="Kopiuj adres">
                    <Copy className="w-4 h-4 text-[#666] hover:text-white" />
                  </button>
                </div>
                <p className="text-xs text-[#555]">Sieć: Solana (SPL Token)</p>
              </div>

              <div className="p-4 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded space-y-2">
                <p className="text-sm font-bold text-[#FFD700] flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Ważne</p>
                <ul className="text-xs text-[#FFD700]/70 space-y-1 list-disc list-inside">
                  <li>Wyślij tokeny tylko z portfela, który posiadasz i kontrolujesz</li>
                  <li>FTRX V2 zostanie przesłane na ten sam adres portfela nadawcy</li>
                  <li>Nie wysyłaj tokenów z adresu giełdy — tylko własny portfel</li>
                  <li>Migracja jest procesem jednorazowym</li>
                </ul>
              </div>

              <Button onClick={() => setStep(2)} className="w-full h-12 font-bold" style={{ background: '#00FFD1', color: '#000' }}>
                Wysłałem tokeny — przejdź do Kroku 2 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Wallet V2 */}
        {step === 2 && (
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
            <CardContent className="p-6 space-y-5">
              <div>
                <p className="text-xs text-[#00FFD1] font-bold uppercase tracking-wider mb-1">Krok 2</p>
                <h2 className="text-xl font-bold">Adres portfela dla FTRX V2</h2>
                <p className="text-sm text-[#888] mt-2 leading-relaxed">
                  Podaj adres portfela Solana, na który mają zostać przesłane tokeny FTRX V2. Powinien być to ten sam adres, z którego wysłałeś FTRX V1 w Kroku 1.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#666] uppercase tracking-wide flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Adres portfela Solana (dla FTRX V2)
                </label>
                <Input
                  type="text"
                  placeholder="Np. 7xKX..."
                  value={walletV2}
                  onChange={e => setWalletV2(e.target.value)}
                  className="bg-black border-[rgba(255,255,255,0.15)] text-white h-12 font-mono text-sm focus:border-[#00FFD1]/50"
                />
                <p className="text-[10px] text-[#444]">Adres Solana w formacie Base58 (32–44 znaki)</p>
              </div>

              <div className="p-3 bg-black/50 border border-[rgba(255,255,255,0.08)] rounded">
                <p className="text-xs text-[#666]">Portfel V1 zarejestrowany do wniosku: <span className="text-[#888] font-mono">{info?.wallet_v1}</span></p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} className="flex-1 h-12" variant="outline" style={{ borderColor: '#333', color: '#888', background: 'transparent' }}>
                  Wróć
                </Button>
                <Button onClick={() => {
                  if (!walletV2) { toast.error('Podaj adres portfela'); return; }
                  if (!walletV2.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) { toast.error('Nieprawidłowy adres Solana'); return; }
                  setStep(3);
                }} className="flex-1 h-12 font-bold" style={{ background: '#00FFD1', color: '#000' }}>
                  Dalej — Krok 3 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Declaration */}
        {step === 3 && (
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-xs text-[#00FFD1] font-bold uppercase tracking-wider mb-1">Krok 3</p>
                <h2 className="text-xl font-bold">Podpisanie oświadczenia</h2>
                <p className="text-sm text-[#888] mt-2 leading-relaxed">
                  Zaznacz poniższe pola, aby potwierdzić znajomość i akceptację warunków migracji FTRX.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-[#555] uppercase tracking-wider font-bold">Oświadczenia obowiązkowe</p>

                <Check
                  id="responsibility"
                  label="Rozumiem odpowiedzialność wynikającą z niniejszego oświadczenia oraz warunki migracji FTRX V1 → V2."
                />
                <Check
                  id="owner"
                  label={`Oświadczam, że jestem właścicielem i posiadam pełną kontrolę nad adresem portfela: ${walletV2 || '(podany w Kroku 2)'}.`}
                />
                <Check
                  id="noEarlySale"
                  label="Zobowiązuję się nie dokonywać sprzedaży tokenów FTRX V2 przed datami wskazanymi w harmonogramie poniżej."
                />

                <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 space-y-3">
                  <p className="text-xs text-[#555] uppercase tracking-wider font-bold">Harmonogram sprzedaży — potwierdzam znajomość</p>

                  <Check
                    id="purexchange"
                    label="od 01.06.2026 — PureXchange.io"
                    sublabel="Pierwsze oficjalne okno sprzedaży FTRX V2"
                  />
                  <Check
                    id="cryptobridge"
                    label="od 20.06.2026 — CryptoBridge → dowolna krypto"
                    sublabel="Sprzedaż przez CryptoBridge na dowolną kryptowalutę"
                  />
                  <Check
                    id="dex"
                    label="od 01.07.2026 — Dowolna giełda DEX → dowolna krypto"
                    sublabel="Pełna dostępność na giełdach zdecentralizowanych"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded space-y-2 text-xs text-[#555]">
                <p><span className="text-[#888]">Email:</span> {info?.email}</p>
                <p><span className="text-[#888]">Portfel V1:</span> <span className="font-mono">{info?.wallet_v1}</span></p>
                <p><span className="text-[#888]">Portfel V2:</span> <span className="font-mono text-[#00FFD1]">{walletV2}</span></p>
                <p className="text-[#333] pt-1 border-t border-[rgba(255,255,255,0.04)] mt-2">FuturoX AI nigdy nie poprosi o klucz prywatny ani seed phrase. Procedura jest non-custodial.</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} className="flex-1 h-12" variant="outline" style={{ borderColor: '#333', color: '#888', background: 'transparent' }}>
                  Wróć
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !allChecked}
                  className="flex-1 h-12 font-bold"
                  style={{ background: allChecked ? '#FFD700' : '#333', color: allChecked ? '#000' : '#666' }}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Złóż oświadczenie i zakończ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info box */}
        <div className="text-center">
          <p className="text-xs text-[#333]">FuturoX AI · futuroxai.com · support@futuroxai.com</p>
        </div>
      </div>
    </div>
  );
}
