import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowLeftRight, Crosshair, TrendingUp, Repeat, Activity, Users,
  Check, Copy, RefreshCw, Wallet, Clock, AlertCircle, ExternalLink
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const PAYMENT_ADDRESS = 'C7Y9MqJjfmEm3WDA2r76acy6gzLVsEhC8RGHV3bsAMYR';
const FTRX_CA = 'CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx';

const BOTS = {
  spread:    { name: 'AI Spread Bot',    color: '#00FFD1', Icon: ArrowLeftRight },
  sniper:    { name: 'AI Sniper Bot',    color: '#FF3366', Icon: Crosshair      },
  trade:     { name: 'AI Trade Bot',     color: '#7B61FF', Icon: TrendingUp     },
  arbitrage: { name: 'AI Arbitrage Bot', color: '#00CCFF', Icon: Repeat         },
  trend:     { name: 'AI Trend Bot',     color: '#22C55E', Icon: Activity       },
  copytrade: { name: 'AI Copy Trade',    color: '#FFB800', Icon: Users          },
};

const STATUS_ORDER = ['pending_payment', 'paid', 'configuring', 'access_granted', 'live'];
const STATUS_STEPS = [
  { id: 'pending_payment', label: 'Oczekiwanie na płatność',        desc: 'Weryfikacja transakcji na blockchain'          },
  { id: 'paid',            label: 'Płatność przyjęta',              desc: 'Transakcja potwierdzona i zweryfikowana'       },
  { id: 'configuring',     label: 'Konfiguracja boota',             desc: 'Personalizacja parametrów strategii'           },
  { id: 'access_granted',  label: 'Przekazanie dostępów do panelu', desc: 'Link do panelu wysłany na e-mail'              },
  { id: 'live',            label: 'Uruchomienie boota',             desc: 'Bot aktywny i pracuje na Twoim kapitale'       },
];
const STEP_COLORS = ['#FFD700', '#00CCFF', '#7B61FF', '#FFB800', '#22C55E'];

export default function BotOrderStatus() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/bot-order/${orderId}`);
      const d = await r.json();
      if (d.success && d.order) {
        setOrder(d.order);
        setError(null);
      } else {
        setError('Zamówienie o podanym numerze nie zostało znalezione.');
      }
    } catch {
      setError('Błąd połączenia z serwerem. Spróbuj ponownie.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFD700] mx-auto" />
        <p className="text-sm text-[#555]">Pobieranie statusu zamówienia...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-[#888] hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-6 h-6 bg-[#FFD700] flex items-center justify-center font-bold text-black text-[9px] rounded">FTRX</div>
        <span className="text-sm font-semibold text-[#888]">Status zamówienia</span>
      </div>
      <div className="max-w-[500px] mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Nie znaleziono zamówienia</h2>
        <p className="text-sm text-[#666]">{error}</p>
        <code className="text-xs text-[#555] block font-mono bg-[#111] px-3 py-2 rounded">{orderId}</code>
        <button onClick={() => navigate('/')} className="text-sm text-[#00FFD1] hover:underline">← Powrót na stronę główną</button>
      </div>
    </div>
  );

  const bot = BOTS[order.bot_id] || BOTS.spread;
  const { Icon } = bot;
  const activeStep = STATUS_ORDER.indexOf(order.status ?? 'pending_payment');
  const isConfiguring = activeStep >= 2;
  const isPendingPayment = order.status === 'pending_payment';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-[#888] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${bot.color}20`, color: bot.color }}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold">{bot.name} — Status zamówienia</span>
        </div>
        <button
          onClick={() => fetchOrder(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-[#666] hover:text-white transition-colors px-2 py-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      <div className="max-w-[660px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Order ID + bot */}
        <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: `${bot.color}25`, background: `${bot.color}07` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${bot.color}20`, color: bot.color }}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-white">{bot.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs text-[#666] font-mono">{order.order_id}</code>
              <button onClick={() => copyText(order.order_id, 'oid')} className="text-[#444] hover:text-[#00FFD1] transition-colors">
                {copied === 'oid' ? <Check className="w-3 h-3 text-[#00FFD1]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="text-xs font-bold px-2 py-1 rounded-full border"
              style={{
                color: STEP_COLORS[activeStep] || '#FFD700',
                background: `${STEP_COLORS[activeStep] || '#FFD700'}15`,
                borderColor: `${STEP_COLORS[activeStep] || '#FFD700'}35`,
              }}
            >
              {STATUS_STEPS[activeStep]?.label}
            </span>
          </div>
        </div>

        {/* Status timeline */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white mb-3">Status zamówienia</h3>
          {STATUS_STEPS.map((s, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            const color = STEP_COLORS[i];
            return (
              <div key={s.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all"
                    style={{
                      borderColor: isDone ? '#22C55E' : isActive ? color : 'rgba(255,255,255,0.07)',
                      background: isDone ? 'rgba(34,197,94,0.12)' : isActive ? `${color}18` : 'transparent',
                      color: isDone ? '#22C55E' : isActive ? color : '#2a2a2a',
                    }}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : isActive ? <span className="animate-pulse text-base leading-none">●</span> : i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className="w-px h-5 mt-1 bg-[rgba(255,255,255,0.05)]" />}
                </div>
                <div className="pb-2 pt-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: isDone ? '#22C55E' : isActive ? color : '#2a2a2a' }}>
                      {s.label}
                    </p>
                    {i === 2 && isConfiguring && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: '#7B61FF', borderColor: '#7B61FF44', background: '#7B61FF12' }}>
                        14 dni konfiguracji
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: isDone ? '#555' : isActive ? `${color}99` : '#1f1f1f' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111] space-y-2">
          <h3 className="text-xs font-bold text-[#555] uppercase tracking-wider mb-2">Szczegóły zamówienia</h3>
          {[
            ['Bot',              bot.name],
            ['E-mail',          order.email],
            ['Kapitał roboczy', `${order.sol_tier} SOL`],
            ['Harmonogram',     `co ${order.payout_interval} dni`],
            ['Subskrypcja',     `$${order.price_usd} USD / mies.`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-1 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <span className="text-xs text-[#555] uppercase tracking-wider">{k}</span>
              <span className="text-sm font-medium text-white">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-start pt-1">
            <span className="text-xs text-[#555] uppercase tracking-wider">Portfel wypłat</span>
            <code className="text-xs text-[#00FFD1] font-mono text-right break-all max-w-[260px]">{order.profit_wallet}</code>
          </div>
        </div>

        {/* Payment instructions — only when pending_payment */}
        {isPendingPayment && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFD700]" />
              Oczekiwanie na płatność — instrukcja
            </h3>
            <p className="text-xs text-[#666]">Wyślij oba poniższe przelewy na adres portfela FuturoX AI:</p>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.07)]">
              <Wallet className="w-4 h-4 text-[#00FFD1] flex-shrink-0" />
              <code className="text-xs text-[#00FFD1] flex-1 break-all font-mono">{PAYMENT_ADDRESS}</code>
              <button onClick={() => copyText(PAYMENT_ADDRESS, 'wallet')} className="text-[#444] hover:text-[#00FFD1] flex-shrink-0 p-1">
                {copied === 'wallet' ? <Check className="w-4 h-4 text-[#00FFD1]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-[rgba(0,204,255,0.05)] border-[rgba(0,204,255,0.2)]">
                <p className="text-xs font-bold text-[#00CCFF] mb-1">1. Kapitał SOL</p>
                <p className="text-xl font-black text-[#00CCFF]">{order.sol_tier} SOL</p>
                <p className="text-[10px] text-[#444] mt-1">Natywny SOL · sieć Solana</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ borderColor: `${bot.color}30`, background: `${bot.color}06` }}>
                <p className="text-xs font-bold mb-1" style={{ color: bot.color }}>2. Subskrypcja FTRX</p>
                <p className="text-xl font-black" style={{ color: bot.color }}>wg kursu FTRX</p>
                <p className="text-[10px] text-[#444] mt-1">≈ ${order.price_usd} USD w FTRX</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.05)]">
              <p className="text-[10px] text-[#444] mb-1">Token CA (FTRX):</p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-[#555] font-mono flex-1 break-all">{FTRX_CA}</code>
                <button onClick={() => copyText(FTRX_CA, 'ca')} className="text-[#444] hover:text-[#00FFD1] flex-shrink-0">
                  {copied === 'ca' ? <Check className="w-3.5 h-3.5 text-[#00FFD1]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access granted message */}
        {order.status === 'access_granted' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FFB800]/08 border border-[#FFB800]/25">
            <ExternalLink className="w-5 h-5 text-[#FFB800] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#FFB800]">Dostępy zostały wysłane!</p>
              <p className="text-xs text-[#FFB800]/70 mt-0.5">
                Link do panelu kontroli bota został wysłany na adres <strong className="text-[#FFB800]">{order.email}</strong>. Sprawdź skrzynkę odbiorczą.
              </p>
            </div>
          </div>
        )}

        {/* Live message */}
        {order.status === 'live' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#22C55E]/08 border border-[#22C55E]/25">
            <div className="w-2.5 h-2.5 bg-[#22C55E] rounded-full animate-pulse flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm font-bold text-[#22C55E]">Bot jest aktywny!</p>
              <p className="text-xs text-[#22C55E]/70 mt-0.5">
                Twój bot pracuje na kapitale {order.sol_tier} SOL. Wypłaty zysków co {order.payout_interval} dni na portfel: <code className="font-mono">{order.profit_wallet?.slice(0,8)}...{order.profit_wallet?.slice(-6)}</code>
              </p>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/')} className="w-full py-3 text-sm text-[#555] hover:text-white transition-colors border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.12)]">
          ← Powrót na stronę główną
        </button>
      </div>
    </div>
  );
}
