import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, RefreshCw, Wallet, Shield, FileCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast, Toaster } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function Declaration2Page() {
  const { id } = useParams();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [walletConfirm, setWalletConfirm] = useState('');
  const [ftrxAmount, setFtrxAmount] = useState('');
  const [checks, setChecks] = useState({
    walletCorrect: false,
    amountCorrect: false,
    listing: false,
    purexchangeOnly: false,
    freeUse: false,
    receiveTokens: false,
  });

  useEffect(() => {
    fetch(`${API}/api/declaration2/${id}/check`)
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

  const allChecked = Object.values(checks).every(Boolean);

  const handleSubmit = async () => {
    if (!walletConfirm.trim()) { toast.error('Wpisz adres portfela do potwierdzenia'); return; }
    if (!walletConfirm.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) { toast.error('Nieprawidłowy format adresu Solana'); return; }
    if (walletConfirm.trim() !== info?.wallet_v1) {
      toast.error('Adres portfela nie zgadza się z zarejestrowanym adresem');
      return;
    }
    if (!ftrxAmount || isNaN(parseFloat(ftrxAmount)) || parseFloat(ftrxAmount) <= 0) {
      toast.error('Podaj prawidłową ilość tokenów FTRX V1');
      return;
    }
    if (!allChecked) { toast.error('Zaznacz wszystkie wymagane oświadczenia'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/declaration2/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_confirmed: walletConfirm.trim(),
          ftrx_amount: parseFloat(ftrxAmount),
          confirmed_wallet_correct: checks.walletCorrect,
          confirmed_amount_correct: checks.amountCorrect,
          confirmed_listing: checks.listing,
          confirmed_purexchange_only: checks.purexchangeOnly,
          confirmed_free_use: checks.freeUse,
          confirmed_receive_tokens: checks.receiveTokens,
        }),
      });
      const d = await r.json();
      if (d.success) { setSubmitted(true); }
      else { toast.error(d.detail || 'Błąd. Spróbuj ponownie.'); }
    } catch { toast.error('Błąd połączenia z serwerem'); }
    setSubmitting(false);
  };

  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const CheckBox = ({ id: cid, label, sublabel }) => (
    <label
      className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg transition-colors hover:bg-white/[0.02]"
      onClick={() => toggle(cid)}
    >
      <div className={`mt-0.5 w-5 h-5 shrink-0 border-2 rounded flex items-center justify-center transition-all ${checks[cid] ? 'bg-[#00FFD1] border-[#00FFD1]' : 'border-[rgba(255,255,255,0.15)] group-hover:border-[#00FFD1]/50'}`}>
        {checks[cid] && <CheckCircle className="w-3.5 h-3.5 text-black" />}
      </div>
      <div>
        <p className="text-sm text-white leading-snug font-medium">{label}</p>
        {sublabel && <p className="text-xs text-[#666] mt-1 leading-relaxed">{sublabel}</p>}
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
      <p className="text-[#666] max-w-sm">Ten link jest nieważny lub wygasł. Sprawdź e-mail z instrukcjami.</p>
      <a href="/" className="mt-4 text-[#00FFD1] hover:underline text-sm">Wróć do strony głównej</a>
    </div>
  );

  if (alreadyDone || submitted) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="w-20 h-20 bg-[#00FFD1]/10 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-[#00FFD1]" />
      </div>
      <h1 className="text-2xl font-bold">Oświadczenie uzupełniające złożone ✓</h1>
      <p className="text-[#888] max-w-sm leading-relaxed">
        Twoje oświadczenie uzupełniające i potwierdzające zostało pomyślnie złożone i zarejestrowane w systemie FuturoX AI.
      </p>
      <div className="text-xs text-[#555] font-mono bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] px-4 py-2 rounded">
        {info?.email}
      </div>
      <a href="/" className="mt-2 text-[#00FFD1] hover:underline text-sm">Strona główna FuturoX AI</a>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster />

      <header className="border-b border-[rgba(255,255,255,0.08)] px-4 md:px-8 py-4">
        <div className="max-w-[760px] mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FFD700] flex items-center justify-center font-bold text-black text-[10px]">FTRX</div>
          <span className="text-lg font-bold">FuturoX AI</span>
          <span className="text-[#333] mx-2">·</span>
          <span className="text-sm text-[#666]">Formularz uzupełniający i potwierdzający — FTRX V2</span>
        </div>
      </header>

      <div className="max-w-[760px] mx-auto px-4 py-10 space-y-6">

        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full">
            <Shield className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-medium text-[#FFD700]">Formularz uzupełniający i potwierdzający — Migracja FTRX V2</span>
          </div>
          <h1 className="text-3xl font-black text-white">Oświadczenie <span className="text-[#FFD700]">uzupełniające</span> i potwierdzające</h1>
          <p className="text-[#888] text-sm">Formularz indywidualny dla: <span className="text-[#00FFD1] font-medium">{info?.email}</span></p>
        </div>

        {/* Registered wallet info */}
        <div className="flex items-start gap-3 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] rounded-xl">
          <Wallet className="w-4 h-4 text-[#888] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Zarejestrowany adres portfela</p>
            <code className="text-sm font-mono text-[#888] break-all">{info?.wallet_v1}</code>
          </div>
        </div>

        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
          <CardContent className="p-6 space-y-7">

            {/* Section 1: Wallet confirm */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00FFD1]/15 flex items-center justify-center text-[#00FFD1] text-xs font-bold">1</div>
                <p className="text-sm font-bold text-white uppercase tracking-wide">Potwierdzenie adresu portfela odbiorczego</p>
              </div>
              <p className="text-xs text-[#666] leading-relaxed pl-8">
                Wpisz ponownie adres portfela Solana, na który mają zostać przesłane tokeny FTRX V2. Musi być identyczny z adresem zarejestrowanym w systemie.
              </p>
              <Input
                type="text"
                placeholder="Wpisz adres portfela Solana..."
                value={walletConfirm}
                onChange={e => setWalletConfirm(e.target.value)}
                className={`bg-black h-12 font-mono text-sm ml-0 transition-colors ${
                  walletConfirm.length > 10
                    ? walletConfirm === info?.wallet_v1
                      ? 'border-[#22C55E]/60 text-[#22C55E]'
                      : 'border-red-500/50 text-red-400'
                    : 'border-[rgba(255,255,255,0.15)] text-white'
                } focus:border-[#00FFD1]/50`}
              />
              {walletConfirm.length > 10 && walletConfirm === info?.wallet_v1 && (
                <p className="text-xs text-[#22C55E] flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Adres poprawny — zgodny z zarejestrowanym
                </p>
              )}
              {walletConfirm.length > 10 && walletConfirm !== info?.wallet_v1 && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Adres nie zgadza się — sprawdź i popraw
                </p>
              )}
            </div>

            <div className="border-t border-[rgba(255,255,255,0.05)]" />

            {/* Section 2: FTRX amount */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#FFD700]/15 flex items-center justify-center text-[#FFD700] text-xs font-bold">2</div>
                <p className="text-sm font-bold text-white uppercase tracking-wide">Potwierdzenie ilości tokenów FTRX V1</p>
              </div>
              <p className="text-xs text-[#666] leading-relaxed pl-8">
                Wpisz dokładną ilość tokenów FTRX V1 przesłanych na adres depozytowy projektu w ramach migracji.
              </p>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Np. 500"
                value={ftrxAmount}
                onChange={e => setFtrxAmount(e.target.value)}
                className="bg-black border-[rgba(255,255,255,0.15)] text-white h-12 font-mono text-sm focus:border-[#FFD700]/50"
              />
              <p className="text-[10px] text-[#444]">Podaj dokładną wartość liczbową — bez spacji ani dodatkowych znaków</p>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.05)]" />

            {/* Section 3: Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF] text-xs font-bold">3</div>
                <p className="text-sm font-bold text-white uppercase tracking-wide">Oświadczenia obowiązkowe</p>
              </div>

              <CheckBox
                id="walletCorrect"
                label={`Potwierdzam poprawność adresu portfela ${walletConfirm || '(wpisz w polu powyżej)'} jako adresu do odbioru tokenów FTRX V2.`}
                sublabel="Oświadczam, że jestem właścicielem tego portfela i posiadam do niego pełen dostęp."
              />

              <CheckBox
                id="amountCorrect"
                label={`Potwierdzam, że łączna ilość tokenów FTRX V1 przesłanych przeze mnie na adres depozytowy wynosi ${ftrxAmount ? `${parseFloat(ftrxAmount).toLocaleString('pl-PL')} FTRX` : '(wpisz w polu powyżej)'}.`}
                sublabel="Oświadczam, że podana kwota jest zgodna z faktycznie przeprowadzoną transakcją."
              />

              <div className="border-t border-[rgba(255,255,255,0.05)] my-3" />
              <p className="text-[10px] text-[#444] uppercase tracking-wider font-bold px-3">Harmonogram i warunki obrotu FTRX V2</p>

              <CheckBox
                id="listing"
                label="Przyjmuję do wiadomości, że PureXchange.io w dniu 10.06.2026 wyznaczył oficjalny listing kryptowaluty FTRX V2 oraz uruchomienie infrastruktury SWAP od dnia 17.06.2026."
                sublabel="Oświadczam, że zapoznałem/am się z powyższą informacją i przyjmuję ją do wiadomości."
              />

              <CheckBox
                id="purexchangeOnly"
                label="Oświadczam i wyrażam zgodę, że jedyną opcją sprzedaży tokenów FTRX V2 od dnia 17.06.2026 do dnia 10.07.2026 będzie platforma PureXchange.io."
                sublabel="Rozumiem, że w tym okresie nie są dostępne inne platformy do sprzedaży FTRX V2 i akceptuję te warunki."
              />

              <CheckBox
                id="freeUse"
                label="Od dnia 10.07.2026 oświadczam i wyrażam zgodę na dowolne użytkowanie tokena FTRX za pośrednictwem dowolnej metody dostępnej na rynkach finansowych i giełdach kryptowalutowych."
                sublabel="Rozumiem, że po dniu 10.07.2026 ograniczenia sprzedaży wygasają i token będzie swobodnie dostępny na wszelkich platformach."
              />

              <div className="border-t border-[rgba(255,255,255,0.05)] my-3" />
              <p className="text-[10px] text-[#444] uppercase tracking-wider font-bold px-3">Odbiór tokenów FTRX V2</p>

              <CheckBox
                id="receiveTokens"
                label={`Wyrażam zgodę na przyjęcie tokenów FTRX V2 na portfel indywidualny ${walletConfirm || '(podany powyżej)'} w przeciągu 50 godzin od momentu podpisania i akceptacji niniejszego oświadczenia.`}
                sublabel="Oświadczam, że jestem przygotowany/a do odbioru tokena FTRX V2 i rozumiem, że środki zostaną przesłane na wskazany portfel w wyżej określonym terminie."
              />
            </div>

            <div className="border-t border-[rgba(255,255,255,0.05)]" />

            {/* Summary */}
            <div className="p-4 bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] rounded-lg space-y-2 text-xs text-[#555]">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="w-3.5 h-3.5 text-[#444]" />
                <p className="text-[10px] text-[#444] uppercase tracking-wider font-bold">Podsumowanie oświadczenia</p>
              </div>
              <p><span className="text-[#666]">Email:</span> <span className="text-[#888]">{info?.email}</span></p>
              <p><span className="text-[#666]">Portfel (odbiór FTRX V2):</span> <span className="font-mono text-[#00FFD1]">{walletConfirm || '—'}</span></p>
              <p><span className="text-[#666]">Ilość FTRX V1:</span> <span className="text-[#FFD700] font-bold">{ftrxAmount ? `${parseFloat(ftrxAmount).toLocaleString('pl-PL')} FTRX` : '—'}</span></p>
              <p><span className="text-[#666]">Oświadczenia:</span> <span className={allChecked ? 'text-[#22C55E] font-bold' : 'text-[#555]'}>{Object.values(checks).filter(Boolean).length} / 6 zaznaczonych</span></p>
              <p className="text-[#2a2a2a] pt-2 border-t border-[rgba(255,255,255,0.04)] mt-2">FuturoX AI nigdy nie poprosi o klucz prywatny ani seed phrase. Procedura jest non-custodial.</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !allChecked || !walletConfirm || !ftrxAmount || walletConfirm !== info?.wallet_v1}
              className="w-full h-13 py-3.5 font-bold text-base transition-all"
              style={{
                background: (allChecked && walletConfirm === info?.wallet_v1 && ftrxAmount) ? '#FFD700' : '#1a1a1a',
                color: (allChecked && walletConfirm === info?.wallet_v1 && ftrxAmount) ? '#000' : '#444',
              }}
            >
              {submitting
                ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Wysyłanie...</>
                : 'Złóż oświadczenie uzupełniające i potwierdzające →'}
            </Button>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-[#2a2a2a]">FuturoX AI · futuroxai.com · support@futuroxai.com</p>
        </div>
      </div>
    </div>
  );
}
