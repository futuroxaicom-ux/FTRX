import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowLeftRight, Crosshair, TrendingUp, Repeat, Activity, Users,
  Check, Copy, ChevronRight, AlertCircle, Wallet, Clock, BarChart3, Zap,
  Shield, Mail, TrendingDown
} from 'lucide-react';
import { Button } from '../components/ui/button';

const PAYMENT_ADDRESS = 'C7Y9MqJjfmEm3WDA2r76acy6gzLVsEhC8RGHV3bsAMYR';
const FTRX_CA = 'CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const BOTS = {
  spread:    { name: 'AI Spread Bot',    price: 99,  color: '#00FFD1', Icon: ArrowLeftRight, tag: 'Market Making'    },
  sniper:    { name: 'AI Sniper Bot',    price: 199, color: '#FF3366', Icon: Crosshair,      tag: 'Token Sniping'    },
  trade:     { name: 'AI Trade Bot',     price: 199, color: '#7B61FF', Icon: TrendingUp,     tag: 'Scalping & Swing' },
  arbitrage: { name: 'AI Arbitrage Bot', price: 99,  color: '#00CCFF', Icon: Repeat,         tag: 'Cross-DEX Arb'   },
  trend:     { name: 'AI Trend Bot',     price: 99,  color: '#22C55E', Icon: Activity,       tag: 'Trend Following'  },
  copytrade: { name: 'AI Copy Trade',    price: 99,  color: '#FFB800', Icon: Users,          tag: 'Copy Trading'     },
};

const SOL_TIERS = [
  { sol: 5,    tier: 'Starter'  },
  { sol: 10,   tier: 'Basic'    },
  { sol: 25,   tier: 'Standard' },
  { sol: 50,   tier: 'Advanced' },
  { sol: 100,  tier: 'Pro'      },
  { sol: 500,  tier: 'Expert'   },
  { sol: 1000, tier: 'Elite'    },
];

const BOT_RETURNS = {
  spread:    ['15–20%', '18–25%', '20–30%', '23–35%', '26–40%', '32–48%', '38–55%'],
  sniper:    ['20–35%', '28–48%', '38–65%', '45–80%', '52–90%', '65–110%','75–130%'],
  trade:     ['18–28%', '25–40%', '32–52%', '38–62%', '45–72%', '55–88%', '65–100%'],
  arbitrage: ['10–15%', '12–18%', '15–22%', '18–28%', '22–35%', '28–45%', '35–55%'],
  trend:     ['15–22%', '18–28%', '22–35%', '28–42%', '32–50%', '42–65%', '52–78%'],
  copytrade: ['20–30%', '25–38%', '30–48%', '38–58%', '45–68%', '55–82%', '65–95%'],
};

const PAYOUT_INTERVALS = [
  { days: 15,  label: 'Co 15 dni',  desc: 'Najczęstsze wypłaty' },
  { days: 30,  label: 'Co 30 dni',  desc: 'Wypłata miesięczna'  },
  { days: 50,  label: 'Co 50 dni',  desc: 'Średni horyzont'     },
  { days: 100, label: 'Co 100 dni', desc: 'Długi horyzont'      },
];

const STATUS_STEPS = [
  { id: 'pending', label: 'Oczekiwanie na płatność',        desc: 'Weryfikacja transakcji na blockchain'        },
  { id: 'paid',    label: 'Płatność przyjęta',              desc: 'Transakcja potwierdzona i zweryfikowana'     },
  { id: 'config',  label: 'Konfiguracja boota',             desc: 'Personalizacja parametrów strategii'         },
  { id: 'access',  label: 'Przekazanie dostępów do panelu', desc: 'Link do panelu wysłany na e-mail'            },
  { id: 'live',    label: 'Uruchomienie boota',             desc: 'Bot aktywny i pracuje na Twoim kapitale'     },
];

const formatFtrx = (amount) => {
  if (!amount) return '—';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
};

export default function BotOrderPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const bot = BOTS[botId] || BOTS.spread;
  const { Icon } = bot;

  const [step, setStep] = useState('form');
  const [ftrxPrice, setFtrxPrice] = useState(null);
  const [solPrice, setSolPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [copiedAddr, setCopiedAddr] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ email: '', solTier: null, payoutInterval: null, profitWallet: '' });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${BACKEND_URL}/api/ftrx/price`),
          fetch(`${BACKEND_URL}/api/crypto/price`),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        if (d1.price) setFtrxPrice(d1.price);
        if (d2?.solana?.usd) setSolPrice(d2.solana.usd);
      } catch (_) {}
      finally { setLoadingPrice(false); }
    };
    fetchPrices();
  }, []);

  const ftrxAmount = ftrxPrice && bot.price > 0 ? Math.round(bot.price / ftrxPrice) : null;
  const selectedTier = form.solTier !== null ? SOL_TIERS[form.solTier] : null;
  const selectedReturn = form.solTier !== null
    ? (BOT_RETURNS[botId]?.[form.solTier] ?? BOT_RETURNS.spread[form.solTier])
    : null;

  const validate = () => {
    const e = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Podaj prawidłowy adres e-mail';
    if (form.solTier === null) e.solTier = 'Wybierz poziom kapitału';
    if (form.payoutInterval === null) e.payoutInterval = 'Wybierz harmonogram wypłat';
    if (!form.profitWallet || form.profitWallet.length < 32 || form.profitWallet.length > 44)
      e.profitWallet = 'Podaj prawidłowy adres portfela Solana (32–44 znaki)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/bot-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          bot_id: botId,
          bot_name: bot.name,
          price_usd: bot.price,
          sol_tier: selectedTier.sol,
          payout_interval: form.payoutInterval,
          profit_wallet: form.profitWallet,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data);
        setStep('summary');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrors({ submit: data.detail || 'Błąd podczas składania zamówienia' });
      }
    } catch (_) {
      setErrors({ submit: 'Błąd połączenia z serwerem. Spróbuj ponownie.' });
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedAddr(key);
    setTimeout(() => setCopiedAddr(''), 2000);
  };

  const setField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="border-b border-[rgba(255,255,255,0.06)] px-4 sm:px-8 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/#bots')} className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Powrót
          </button>
          <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${bot.color}20`, color: bot.color }}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold">Zamówienie — {bot.name}</span>
          </div>
        </div>

        <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

          <div className="flex items-center gap-4 p-4 sm:p-6 rounded-xl border" style={{ borderColor: `${bot.color}30`, background: `${bot.color}07` }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${bot.color}20`, color: bot.color }}>
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">{bot.name}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${bot.color}20`, color: bot.color }}>
                  {bot.tag}
                </span>
              </div>
              <p className="text-sm text-[#777] mt-0.5">Subskrypcja miesięczna · płatność w FTRX</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black text-white">${bot.price} <span className="text-sm font-normal text-[#666]">USD</span></p>
              {loadingPrice && <p className="text-xs text-[#555] mt-0.5">Pobieranie kursu...</p>}
              {ftrxAmount && <p className="text-xs mt-0.5" style={{ color: bot.color }}>≈ {formatFtrx(ftrxAmount)} FTRX</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
                Wybierz kapitał boota do pracy
              </h2>
              <p className="text-xs text-[#555] mt-1 ml-8">Bot potrzebuje kapitału SOL do realizowania transakcji. Im więcej — tym większy potencjał zysku.</p>
            </div>
            {errors.solTier && (
              <p className="text-xs text-red-400 flex items-center gap-1 ml-8">
                <AlertCircle className="w-3 h-3" />{errors.solTier}
              </p>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {SOL_TIERS.map((t, i) => {
                const ret = BOT_RETURNS[botId]?.[i] ?? BOT_RETURNS.spread[i];
                const sel = form.solTier === i;
                return (
                  <button
                    key={i}
                    onClick={() => setField('solTier', i)}
                    className="relative flex flex-col items-center p-2.5 sm:p-3 rounded-lg border transition-all duration-200 text-center"
                    style={{
                      borderColor: sel ? bot.color : 'rgba(255,255,255,0.08)',
                      background: sel ? `${bot.color}15` : '#111',
                      boxShadow: sel ? `0 0 18px ${bot.color}22` : 'none',
                    }}
                  >
                    {i === 6 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-[#FFB800] text-black px-1.5 py-px rounded-full uppercase whitespace-nowrap">Elite</span>
                    )}
                    <span className="text-base sm:text-lg font-black leading-none" style={{ color: sel ? bot.color : '#fff' }}>{t.sol}</span>
                    <span className="text-[9px] text-[#555] mt-0.5">SOL</span>
                    <span className="text-[10px] font-bold mt-1.5 leading-none" style={{ color: sel ? bot.color : '#777' }}>{ret}</span>
                    <span className="text-[9px] text-[#444]">/mies.</span>
                  </button>
                );
              })}
            </div>
            {form.solTier !== null && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.06)]">
                <Zap className="w-4 h-4 text-[#00FFD1] flex-shrink-0" />
                <p className="text-sm text-[#bbb]">
                  <strong className="text-white">{SOL_TIERS[form.solTier].tier}</strong> — {SOL_TIERS[form.solTier].sol} SOL kapitału roboczego · szacowany zysk:&nbsp;
                  <strong style={{ color: bot.color }}>{selectedReturn}</strong> mies.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
                Harmonogram wypłat zysków
              </h2>
              <p className="text-xs text-[#555] mt-1 ml-8">Co ile dni zyski mają być automatycznie przesyłane na Twój portfel</p>
            </div>
            {errors.payoutInterval && (
              <p className="text-xs text-red-400 flex items-center gap-1 ml-8"><AlertCircle className="w-3 h-3" />{errors.payoutInterval}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PAYOUT_INTERVALS.map(({ days, label, desc }) => {
                const sel = form.payoutInterval === days;
                return (
                  <button
                    key={days}
                    onClick={() => setField('payoutInterval', days)}
                    className="flex flex-col items-center p-4 rounded-lg border transition-all duration-200 text-center"
                    style={{
                      borderColor: sel ? bot.color : 'rgba(255,255,255,0.08)',
                      background: sel ? `${bot.color}15` : '#111',
                    }}
                  >
                    <Clock className="w-5 h-5 mb-2" style={{ color: sel ? bot.color : '#555' }} />
                    <span className="text-base font-black" style={{ color: sel ? bot.color : '#fff' }}>{days} dni</span>
                    <span className="text-[11px] text-[#666] mt-1">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
                Adres portfela Solana do wypłat zysków
              </h2>
              <p className="text-xs text-[#555] mt-1 ml-8">Na ten adres bot będzie automatycznie przekazywał wypracowane zyski</p>
            </div>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="text"
                placeholder="np. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                value={form.profitWallet}
                onChange={e => setField('profitWallet', e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-lg border bg-[#111] text-white text-sm placeholder-[#333] outline-none font-mono transition-colors"
                style={{ borderColor: errors.profitWallet ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                onFocus={e => e.target.style.borderColor = bot.color}
                onBlur={e => e.target.style.borderColor = errors.profitWallet ? '#ef4444' : 'rgba(255,255,255,0.1)'}
              />
            </div>
            {errors.profitWallet && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.profitWallet}</p>}
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00FFD1]/10 text-[#00FFD1] text-xs font-black flex items-center justify-center flex-shrink-0">4</span>
                Adres e-mail
              </h2>
              <p className="text-xs text-[#555] mt-1 ml-8">Potwierdzenie zamówienia i dostęp do panelu zostaną wysłane na ten adres</p>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
              <input
                type="email"
                placeholder="twoj@email.com"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-lg border bg-[#111] text-white text-sm placeholder-[#333] outline-none transition-colors"
                style={{ borderColor: errors.email ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                onFocus={e => e.target.style.borderColor = bot.color}
                onBlur={e => e.target.style.borderColor = errors.email ? '#ef4444' : 'rgba(255,255,255,0.1)'}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>

          <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111] space-y-3">
            <h3 className="text-xs font-bold text-[#666] uppercase tracking-wider">Podsumowanie kosztów</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#888]">Subskrypcja miesięczna ({bot.name})</span>
                <span className="text-sm font-bold text-white">${bot.price} USD</span>
              </div>
              {ftrxAmount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888]">Odpowiednik w FTRX</span>
                  <span className="text-sm font-bold" style={{ color: bot.color }}>≈ {formatFtrx(ftrxAmount)} FTRX</span>
                </div>
              )}
              {selectedTier && (
                <>
                  <div className="my-1 border-t border-[rgba(255,255,255,0.05)]" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#888]">Kapitał roboczy boota</span>
                    <span className="text-sm font-bold text-white">{selectedTier.sol} SOL</span>
                  </div>
                  {solPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#888]">Wartość kapitału</span>
                      <span className="text-xs text-[#555]">≈ ${(selectedTier.sol * solPrice).toLocaleString('pl-PL')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-[#444] pt-1 border-t border-[rgba(255,255,255,0.05)]">
              Płatność w 2 etapach na ten sam portfel: (1) {selectedTier ? `${selectedTier.sol} SOL` : 'X SOL'} jako kapitał roboczy + (2) FTRX za subskrypcję
            </p>
          </div>

          {errors.submit && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-14 text-base font-black tracking-wide transition-all"
            style={{ background: `linear-gradient(135deg, ${bot.color}, ${bot.color}bb)`, color: '#000', boxShadow: `0 0 30px ${bot.color}35` }}
          >
            {submitting ? 'Przetwarzanie...' : 'Złóż zamówienie'}
            {!submitting && <ChevronRight className="w-5 h-5 ml-2" />}
          </Button>

          <p className="text-xs text-center text-[#444]">Po złożeniu zamówienia otrzymasz instrukcje płatności oraz dane do panelu kontroli boota.</p>
        </div>
      </div>
    );
  }

  const orderReturn = order
    ? (BOT_RETURNS[botId]?.[SOL_TIERS.findIndex(t => t.sol === order.sol_tier)] ?? '—')
    : '—';
  const orderTierLabel = order ? (SOL_TIERS.find(t => t.sol === order.sol_tier)?.tier ?? '') : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 sm:px-8 py-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${bot.color}20`, color: bot.color }}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-semibold">{bot.name} — Potwierdzenie zamówienia</span>
      </div>

      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        <div className="text-center space-y-3 py-2">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: `${bot.color}20` }}>
            <Check className="w-8 h-8" style={{ color: bot.color }} />
          </div>
          <h1 className="text-2xl font-black text-white">Zamówienie złożone!</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-[#666]">Numer zamówienia:</span>
            <code className="text-sm font-black text-white bg-[#111] px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.08)]">{order?.order_id}</code>
            <button onClick={() => copyText(order?.order_id, 'oid')} className="text-[#555] hover:text-[#00FFD1] transition-colors">
              {copiedAddr === 'oid' ? <Check className="w-3.5 h-3.5 text-[#00FFD1]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-[#555]">Zapisz numer zamówienia — będzie potrzebny przy weryfikacji płatności</p>
        </div>

        <div className="p-5 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#111] space-y-2.5">
          <h3 className="text-xs font-bold text-[#555] uppercase tracking-wider mb-3">Szczegóły zamówienia</h3>
          {[
            ['Bot',                  `${bot.name} (${bot.tag})`],
            ['E-mail',               order?.email],
            ['Poziom kapitału',      `${order?.sol_tier} SOL — ${orderTierLabel}`],
            ['Szacowany zysk mies.', orderReturn],
            ['Harmonogram wypłat',   `co ${order?.payout_interval} dni`],
            ['Portfel do wypłat',    order?.profit_wallet],
            ['Subskrypcja',          `$${bot.price} USD / miesiąc`],
            ['Równowartość FTRX',    ftrxAmount ? `≈ ${formatFtrx(ftrxAmount)} FTRX` : 'wg kursu rynkowego'],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-0.5 py-1 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <span className="text-xs text-[#555] uppercase tracking-wider w-40 flex-shrink-0">{label}</span>
              <span className="text-sm font-medium text-white sm:text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-bold text-white">Instrukcja płatności</h3>
          <p className="text-sm text-[#777]">
            Wyślij <strong className="text-white">oba poniższe przelewy</strong> na ten sam adres portfela FuturoX AI:
          </p>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)]">
            <Wallet className="w-4 h-4 text-[#00FFD1] flex-shrink-0" />
            <code className="text-xs text-[#00FFD1] flex-1 break-all font-mono">{PAYMENT_ADDRESS}</code>
            <button onClick={() => copyText(PAYMENT_ADDRESS, 'wallet')} className="text-[#555] hover:text-[#00FFD1] transition-colors flex-shrink-0 p-1">
              {copiedAddr === 'wallet' ? <Check className="w-4 h-4 text-[#00FFD1]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-4 rounded-xl border bg-[rgba(0,204,255,0.05)]" style={{ borderColor: 'rgba(0,204,255,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#00CCFF]/15 text-[#00CCFF] text-xs font-black flex items-center justify-center">1</div>
              <span className="text-sm font-bold text-[#00CCFF]">Kapitał roboczy — SOL</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#888]">Kwota do wysłania</span>
              <span className="text-2xl font-black text-[#00CCFF]">{order?.sol_tier} SOL</span>
            </div>
            <p className="text-xs text-[#555] mt-2">Sieć: Solana · Token: SOL natywny (nie wrapped)</p>
          </div>

          <div className="p-4 rounded-xl border" style={{ borderColor: `${bot.color}30`, background: `${bot.color}06` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center" style={{ background: `${bot.color}20`, color: bot.color }}>2</div>
              <span className="text-sm font-bold" style={{ color: bot.color }}>Subskrypcja miesięczna — FTRX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#888]">Kwota do wysłania</span>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: bot.color }}>{ftrxAmount ? formatFtrx(ftrxAmount) : '—'} FTRX</p>
                <p className="text-xs text-[#555]">≈ ${bot.price} USD wg aktualnego kursu</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
              <p className="text-[10px] text-[#444] font-mono break-all">Token CA: {FTRX_CA}</p>
              <button onClick={() => copyText(FTRX_CA, 'ca')} className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#00FFD1] transition-colors mt-1">
                {copiedAddr === 'ca' ? <Check className="w-3 h-3 text-[#00FFD1]" /> : <Copy className="w-3 h-3" />}
                {copiedAddr === 'ca' ? 'Skopiowano' : 'Kopiuj CA'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)]">
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#555] flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#777]">Klauzula podatkowa i prawna</p>
              <p className="text-[11px] text-[#444] leading-relaxed">
                Użytkownik jest wyłącznie odpowiedzialny za wszelkie zobowiązania podatkowe wynikające z zysków wygenerowanych przez bota, zgodnie z przepisami obowiązującymi w kraju zamieszkania. FuturoX AI nie świadczy usług doradztwa podatkowego ani prawnego. Zyski generowane przez boty są szacunkowe i mogą się różnić w zależności od warunków rynkowych — handel kryptowalutami wiąże się z ryzykiem utraty kapitału. Przesłane SOL stanowi kapitał roboczy i może być narażone na ryzyko rynkowe. Bot nie przechowuje trwale środków użytkownika. Złożenie zamówienia jest równoznaczne z akceptacją warunków świadczenia usług FuturoX AI.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-white mb-3">Status zamówienia</h3>
          {STATUS_STEPS.map((s, i) => (
            <div key={s.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                  i === 0
                    ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]'
                    : 'border-[rgba(255,255,255,0.08)] text-[#333]'
                }`}>
                  {i === 0 ? <span className="animate-pulse text-base">●</span> : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && <div className="w-px h-6 mt-1 bg-[rgba(255,255,255,0.05)]" />}
              </div>
              <div className="pb-3 pt-1">
                <p className={`text-sm font-semibold ${i === 0 ? 'text-[#FFD700]' : 'text-[#333]'}`}>{s.label}</p>
                <p className={`text-xs mt-0.5 ${i === 0 ? 'text-[#888]' : 'text-[#2a2a2a]'}`}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-xl border space-y-4" style={{ borderColor: `${bot.color}20`, background: `${bot.color}05` }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: bot.color }} />
              <h3 className="text-base font-bold text-white">Panel Boota — podgląd</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD700]/10 text-[#FFD700] font-bold uppercase tracking-wider">
              Aktywuje się po płatności
            </span>
          </div>
          <p className="text-xs text-[#555]">Tak będzie wyglądał Twój panel po uruchomieniu boota:</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Zysk dzienny',       Icon: TrendingUp   },
              { label: 'Zysk miesięczny',    Icon: BarChart3    },
              { label: 'Wypłacono na portfel', Icon: Wallet      },
            ].map(({ label, Icon: StatIcon }) => (
              <div key={label} className="p-3 sm:p-4 rounded-xl bg-[#0a0a0a] border border-[rgba(255,255,255,0.05)] text-center">
                <StatIcon className="w-4 h-4 mx-auto mb-2 text-[#444]" />
                <p className="text-[9px] sm:text-[10px] text-[#555] uppercase tracking-wider leading-tight">{label}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-pulse" />
                  <p className="text-xs font-bold text-[#FFD700]">in progress</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-center text-[#444]">
            Pełny dostęp do panelu zostanie przesłany na <strong className="text-[#666]">{order?.email}</strong> po potwierdzeniu płatności.
          </p>
        </div>

        <Button
          onClick={() => navigate('/')}
          className="w-full h-12 font-bold text-sm border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
          style={{ background: '#111', color: '#fff' }}
        >
          Powrót na stronę główną
        </Button>
      </div>
    </div>
  );
}
