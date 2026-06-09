import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Mail, Wallet, RefreshCw, Zap, Shield, TrendingUp, Check, Clock, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { toast, Toaster } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

const DIST_START = new Date('2026-06-09T17:00:00Z');
const DIST_TOTAL_H = 50;
const DIST_END = new Date(DIST_START.getTime() + DIST_TOTAL_H * 3600000);


export default function UpdatePage() {
  const [email, setEmail] = useState('');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const distElapsed = Math.max(0, Math.min(DIST_TOTAL_H, (now - DIST_START) / 3600000));
  const distPct = (distElapsed / DIST_TOTAL_H) * 100;
  const isStarted = now >= DIST_START;
  const isComplete = now >= DIST_END;
  const timeRemaining = isComplete ? 0 : Math.max(0, (DIST_END - now) / 3600000);
  const remHours = Math.floor(timeRemaining);
  const remMins = Math.floor((timeRemaining - remHours) * 60);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !wallet) { toast.error('Wypełnij wszystkie pola'); return; }
    if (!wallet.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) { toast.error('Podaj poprawny adres portfela Solana'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/update-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, wallet_address: wallet }),
      });
      const d = await r.json();
      if (d.success) { setSubmitted(true); }
      else { toast.error(d.detail || 'Wystąpił błąd. Spróbuj ponownie.'); }
    } catch { toast.error('Błąd połączenia z serwerem'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster />

      <header className="border-b border-[rgba(255,255,255,0.08)] px-4 md:px-8 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3">
          <a href="/" className="text-[#666] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="w-8 h-8 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px]">FTRX</div>
          <span className="text-lg font-bold">FuturoX AI</span>
        </div>
      </header>

      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#FFD700] opacity-[0.03] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#00FFD1] opacity-[0.03] blur-[150px] rounded-full"></div>
        </div>
        <div className="relative max-w-[1200px] mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full">
            <span className="w-2 h-2 bg-[#FFD700] rounded-full animate-ping"></span>
            <span className="text-sm font-medium text-[#FFD700]">Aktualizacja obowiązkowa</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight">
            FTRX <span className="text-[#FFD700]">V1</span> → <span className="text-[#00FFD1]">V2</span>
          </h1>
          <p className="text-lg text-[rgba(255,255,255,0.7)] max-w-2xl mx-auto">
            Przeprowadzamy migrację tokena FTRX do nowej, ulepszonej wersji V2. Aby zachować swoje tokeny, wypełnij poniższy formularz.
          </p>
        </div>
      </section>

      <section className="px-4 pb-12">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-4 mb-12">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 bg-[#FFD700]/10 flex items-center justify-center rounded">
                <Zap className="w-5 h-5 text-[#FFD700]" />
              </div>
              <h3 className="font-bold text-white">Dlaczego V2?</h3>
              <p className="text-sm text-[#888] leading-relaxed">
                Token FTRX V2 to nowy, ulepszony kontrakt z rozszerzonymi funkcjami — lepszą tokenomiką, integracją z ekosystemem AI oraz silniejszą ochroną przed manipulacją.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 bg-[#00FFD1]/10 flex items-center justify-center rounded">
                <Shield className="w-5 h-5 text-[#00FFD1]" />
              </div>
              <h3 className="font-bold text-white">Twoje tokeny są bezpieczne</h3>
              <p className="text-sm text-[#888] leading-relaxed">
                Wymiana odbywa się w stosunku 1:1. Każdy token FTRX V1 zostanie zamieniony na jeden token FTRX V2. Twoje saldo nie zmieni się.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
            <CardContent className="p-6 space-y-3">
              <div className="w-10 h-10 bg-[#AA44FF]/10 flex items-center justify-center rounded">
                <TrendingUp className="w-5 h-5 text-[#AA44FF]" />
              </div>
              <h3 className="font-bold text-white">Termin migracji</h3>
              <p className="text-sm text-[#888] leading-relaxed">
                Migracja jest obowiązkowa. Po upływie okresu przejściowego tokeny V1 stracą swoją wartość. Zgłoś się jak najszybciej.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-[800px] mx-auto mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Jak przebiega aktualizacja?</h2>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Wypełnij formularz', desc: 'Podaj adres email oraz adres portfela Solana, na którym przechowujesz tokeny FTRX V1.', color: '#FFD700' },
              { step: '02', title: 'Weryfikacja', desc: 'Nasz zespół zweryfikuje Twój wniosek i sprawdzi saldo tokenów FTRX V1 na podanym adresie.', color: '#00FFD1' },
              { step: '03', title: 'Wymiana tokenów', desc: 'Tokeny FTRX V1 zostaną zamienione na FTRX V2 w stosunku 1:1 i przesłane na ten sam adres portfela.', color: '#AA44FF' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 p-4 bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded">
                <div className="text-2xl font-black shrink-0" style={{ color: item.color }}>{item.step}</div>
                <div>
                  <h4 className="font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-[#888]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status: Aktualizacja complete */}
        <div className="max-w-[800px] mx-auto mb-6">
          <div className="flex items-center gap-3 p-4 bg-[#00FFD1]/5 border border-[#00FFD1]/30 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#00FFD1]/15 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-[#00FFD1]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#00FFD1]">Aktualizacja complete</p>
              <p className="text-sm text-[#00FFD1]/70 mt-0.5">
                Migracja FTRX V1 → V2 zakończona: <span className="font-bold text-[#00FFD1]">09.06.2026 godz. 19:00</span>
              </p>
            </div>
          </div>
        </div>

        {/* FTRX Distribution Section */}
        <div className="max-w-[800px] mx-auto mb-10 space-y-4">
          <div className="p-5 rounded-xl border border-[rgba(255,215,0,0.2)] bg-[#FFD700]/04">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-4 h-4 text-[#FFD700]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rozpoczęcie przesyłania FTRX na portfele indywidualnie</h3>
                <p className="text-xs text-[#666] mt-0.5">Dystrybucja tokenów FTRX V2 do wszystkich zweryfikowanych portfeli</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#888]">Postęp dystrybucji FTRX V2</span>
                <span className="font-bold" style={{ color: isComplete ? '#22C55E' : '#FFD700' }}>
                  {isComplete ? 'Zakończono' : isStarted ? `${Math.round(distPct)}%` : 'Wkrótce'}
                </span>
              </div>
              <div className="h-3 bg-[#111] rounded-full overflow-hidden border border-[rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${distPct}%`,
                    background: isComplete
                      ? 'linear-gradient(90deg, #22C55E, #00FFD1)'
                      : 'linear-gradient(90deg, #FFD700, #FFB800)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#333]">
                <span>0h</span>
                {!isComplete && isStarted && (
                  <span className="text-[#555]">
                    Pozostało: <strong className="text-[#FFD700]">{remHours}h {remMins}m</strong>
                  </span>
                )}
                {isComplete && (
                  <span className="text-[#22C55E] font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Wszystkie portfele zaktualizowane
                  </span>
                )}
                <span>50h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-[560px] mx-auto">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-[#00FFD1]/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-[#00FFD1]" />
              </div>
              <h3 className="text-2xl font-bold text-white">Wniosek złożony!</h3>
              <p className="text-[#888]">
                Twój wniosek o aktualizację FTRX V1 → V2 został przyjęty. Skontaktujemy się z Tobą na podany adres email z dalszymi instrukcjami.
              </p>
              <p className="text-sm text-[#555]">Portfel: <span className="text-[#00FFD1] font-mono">{wallet.substring(0, 12)}...{wallet.slice(-6)}</span></p>
              <Button onClick={() => window.location.href = '/'} className="mt-4" style={{ background: '#00FFD1', color: '#000' }}>
                Wróć na stronę główną
              </Button>
            </div>
          ) : (
            <Card className="bg-[#0a0a0a] border-[#FFD700]/20]">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">Złóż wniosek o aktualizację</h3>
                  <p className="text-sm text-[#666]">Wypełnij poniższy formularz, aby zakwalifikować się do migracji FTRX V1 → V2.</p>
                </div>

                <div className="p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#FFD700]/80">Podaj adres portfela, na którym aktualnie przechowujesz tokeny FTRX V1 w sieci Solana.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#666] uppercase tracking-wide flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Adres email
                    </label>
                    <Input
                      type="email"
                      placeholder="twoj@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="bg-black border-[rgba(255,255,255,0.15)] text-white h-12 focus:border-[#FFD700]/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#666] uppercase tracking-wide flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Adres portfela Solana (FTRX V1)
                    </label>
                    <Input
                      type="text"
                      placeholder="Np. 7xKX..."
                      value={wallet}
                      onChange={e => setWallet(e.target.value)}
                      required
                      className="bg-black border-[rgba(255,255,255,0.15)] text-white h-12 font-mono text-sm focus:border-[#00FFD1]/50"
                    />
                    <p className="text-[10px] text-[#444]">Adres portfela Solana (Base58) na którym posiadasz tokeny FTRX V1</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email || !wallet}
                    className="w-full h-12 font-bold text-black"
                    style={{ background: loading ? '#555' : '#FFD700' }}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Złóż wniosek o aktualizację <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 px-4 text-center">
        <p className="text-[#333] text-sm">© 2026 FuturoX AI. Migracja FTRX V1 → V2.</p>
      </footer>
    </div>
  );
}
