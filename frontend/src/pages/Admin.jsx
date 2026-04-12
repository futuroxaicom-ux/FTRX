import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Play, Square, RefreshCw, Plus, Trash2, Settings, Activity,
  Wallet, ArrowLeft, Lock, Eye, EyeOff, AlertTriangle,
  TrendingUp, Zap, XCircle, Star, Download, Upload,
  Calculator, Users, Clock, Target, Coins, Link2, BarChart3,
  Crosshair, GitBranch, Copy, ChevronRight, UserPlus
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL || '';

const OTHER_BOTS = [
  { id: 'spread', name: 'Spread Bot', icon: TrendingUp, color: '#FFD700', desc: 'Market making' },
  { id: 'sniper', name: 'Sniper Bot', icon: Crosshair, color: '#FF4444', desc: 'Snipuj nowe pule' },
  { id: 'trade', name: 'Trade Bot', icon: Target, color: '#4488FF', desc: 'Auto-trading' },
  { id: 'arbitrage', name: 'Arbitrage Bot', icon: GitBranch, color: '#AA44FF', desc: 'Arbitraz DEX' },
  { id: 'copytrade', name: 'Copy Trade', icon: Copy, color: '#FF8844', desc: 'Kopiuj wieloryby' },
  { id: 'holder', name: 'Holder Bot', icon: UserPlus, color: '#00CCFF', desc: 'Twórz holderów' },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBot, setSelectedBot] = useState('volume');

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) { sessionStorage.setItem('adm', pw); setAuthed(true); }
      else toast.error('Nieprawidlowe haslo');
    } catch { toast.error('Blad polaczenia'); }
    setLoading(false);
  };

  if (!authed) {
    const s = sessionStorage.getItem('adm');
    if (s) { setPw(s); setAuthed(true); return null; }
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card data-testid="admin-login-card" className="bg-[#0a0a0a] border-[rgba(255,255,255,0.15)] w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4 rounded"><Lock className="w-8 h-8 text-[#00FFD1]" /></div>
            <CardTitle className="text-white text-2xl">Bot Admin Panel</CardTitle>
            <p className="text-[#666] text-sm mt-2">FuturoX AI - Panel Administracyjny</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={login} className="space-y-4">
              <Input data-testid="admin-password-input" type="password" placeholder="Haslo admina" value={pw} onChange={e => setPw(e.target.value)} className="bg-black border-[rgba(255,255,255,0.2)] text-white h-12" />
              <Button data-testid="admin-login-btn" type="submit" disabled={loading || !pw} className="btn-primary w-full h-12">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Zaloguj'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (selectedBot === 'volume') {
    return <Dashboard pw={pw} onLogout={() => { sessionStorage.removeItem('adm'); setAuthed(false); }} onSwitchBot={setSelectedBot} />;
  }

  if (selectedBot === 'analytics') {
    return <AnalyticsDashboard pw={pw} onBack={() => setSelectedBot('volume')} />;
  }

  return <GenericBotDashboard botType={selectedBot} pw={pw} onBack={() => setSelectedBot('volume')} />;
}

function Dashboard({ pw, onLogout, onSwitchBot }) {
  const [status, setStatus] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [costs, setCosts] = useState(null);
  const [busy, setBusy] = useState(false);
  const h = { 'Content-Type': 'application/json', 'x-admin-password': pw };

  const fetchAll = useCallback(async () => {
    const headers = { 'Content-Type': 'application/json', 'x-admin-password': pw };
    try {
      const [sR, wR, cR] = await Promise.all([
        fetch(`${API}/api/admin/bot/status`, { headers }),
        fetch(`${API}/api/admin/wallets`, { headers }),
        fetch(`${API}/api/admin/bot/costs`, { headers }),
      ]);
      if (sR.ok) setStatus(await sR.json());
      if (wR.ok) { const d = await wR.json(); setWallets(d.wallets || []); }
      if (cR.ok) setCosts(await cR.json());
    } catch { /* ignore */ }
  }, [pw]);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/bot/status`, { headers: { 'x-admin-password': pw } });
      if (r.ok) setStatus(await r.json());
    } catch { /* */ }
  }, [pw]);

  useEffect(() => { fetchAll(); const i = setInterval(fetchStatus, 5000); return () => clearInterval(i); }, [fetchAll, fetchStatus]);

  const apiCall = async (url, method = 'POST', body = null) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}${url}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json();
      if (d.success !== false && !d.error) toast.success(d.message || 'OK');
      else toast.error(d.error || d.message || d.detail || 'Blad');
      await fetchAll();
      return d;
    } catch (e) { toast.error('Blad: ' + e.message); }
    finally { setBusy(false); }
  };

  const cfg = status?.config || {};
  const stats = status?.stats || {};
  const running = status?.running;

  const volPct = cfg.target_volume_sol ? Math.min(100, ((stats.daily_volume_sol || 0) / cfg.target_volume_sol) * 100) : 0;
  const makerPct = cfg.target_makers ? Math.min(100, ((status?.daily_wallets_used || 0) / cfg.target_makers) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[rgba(255,255,255,0.1)] px-4 md:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[#666] hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></a>
            <div className="w-8 h-8 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px]">FTRX</div>
            <span className="text-lg font-bold">Volume Bot</span>
            {running && <span data-testid="bot-running-badge" className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded animate-pulse">AKTYWNY</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll} className="p-2 hover:bg-white/5 rounded"><RefreshCw className={`w-4 h-4 text-[#666] ${busy ? 'animate-spin' : ''}`} /></button>
            <Button onClick={onLogout} variant="ghost" className="text-[#666] hover:text-white text-sm">Wyloguj</Button>
          </div>
        </div>
        {/* Bot Navigation */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          <span className="text-xs text-[#00FFD1] bg-[#00FFD1]/10 px-2.5 py-1 rounded font-bold border border-[#00FFD1]/30 whitespace-nowrap">Volume Bot</span>
          {OTHER_BOTS.map(b => (
            <button key={b.id} onClick={() => onSwitchBot(b.id)}
              className="text-xs px-2.5 py-1 rounded border border-[rgba(255,255,255,0.1)] hover:border-opacity-40 transition-all whitespace-nowrap"
              style={{ color: b.color, borderColor: `${b.color}33` }}>
              {b.name}
            </button>
          ))}
          <button onClick={() => onSwitchBot('analytics')}
            className="text-xs px-2.5 py-1 rounded border border-[rgba(255,255,255,0.1)] hover:border-opacity-40 transition-all whitespace-nowrap text-[#00FF88] border-[#00FF8833]">
            Analytics
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Activity className="w-5 h-5" />} label="Status" value={running ? 'Aktywny' : 'Zatrzymany'} color={running ? 'text-green-400' : 'text-red-400'} />
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] p-4 rounded">
            <div className="flex items-center gap-2 text-[#444] mb-1"><Target className="w-4 h-4" /><span className="text-xs uppercase">Volume dzienny</span></div>
            <p className="text-xl font-bold text-[#00FFD1]">{(stats.daily_volume_sol || 0).toFixed(2)} <span className="text-sm text-[#666]">/ {cfg.target_volume_sol || 0} SOL</span></p>
            <ProgressBar pct={volPct} />
          </div>
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] p-4 rounded">
            <div className="flex items-center gap-2 text-[#444] mb-1"><Users className="w-4 h-4" /><span className="text-xs uppercase">Makers</span></div>
            <p className="text-xl font-bold text-[#00FFD1]">{status?.daily_wallets_used || 0} <span className="text-sm text-[#666]">/ {cfg.target_makers || 0}</span></p>
            <ProgressBar pct={makerPct} />
          </div>
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Trades / Transfers / Bledy" value={`${stats.daily_trades || 0} / ${stats.daily_transfers || 0} / ${stats.errors || 0}`} color="text-white" />
        </div>

        {/* Organic mode indicator + Cost Efficiency */}
        {running && (
          <div className="space-y-2">
            <div className="bg-[rgba(0,255,209,0.03)] border border-[rgba(0,255,209,0.12)] rounded p-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-[#00FFD1] font-semibold flex items-center gap-1.5"><Zap className="w-4 h-4" />Tryb Organiczny</span>
              <span className="text-[#666]">Holdery: <span className="text-white font-medium">{status?.token_holders || 0}</span></span>
              <span className="text-[#666]">BUY od sprzedazy: <span className="text-white font-medium">{status?.buys_since_sell || 0}</span></span>
              <span className="text-[#666]">Ostatnia akcja: <span className={`font-medium ${status?.last_action === 'BUY' ? 'text-green-400' : status?.last_action === 'SELL' ? 'text-blue-400' : status?.last_action === 'TRANSFER' ? 'text-yellow-400' : 'text-white'}`}>{status?.last_action || '-'}</span></span>
            </div>
            {status?.efficiency && (
              <div data-testid="cost-efficiency" className="bg-[rgba(255,165,0,0.03)] border border-[rgba(255,165,0,0.12)] rounded p-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                <div>
                  <p className="text-[#666] text-xs">Success rate</p>
                  <p className={`font-bold ${status.efficiency.success_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>{status.efficiency.success_rate}%</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">Wydano (BUY)</p>
                  <p className="font-bold text-red-400">{status.efficiency.sol_spent} SOL</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">Odzyskano (SELL)</p>
                  <p className="font-bold text-green-400">{status.efficiency.sol_recovered} SOL</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">Koszt netto</p>
                  <p className="font-bold text-orange-400">{status.efficiency.net_cost_sol} SOL</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">Koszt / trade</p>
                  <p className="font-bold text-white">{status.efficiency.cost_per_trade} SOL</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">Koszt / maker</p>
                  <p className="font-bold text-white">{status.efficiency.cost_per_maker} SOL</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Chart */}
        <ActivityChart transactions={status?.recent_transactions || []} />

        {/* Controls + Config */}
        <div className="grid md:grid-cols-2 gap-4">
          <BotControls running={running} stats={stats} onStart={() => apiCall('/api/admin/bot/start')} onStop={() => apiCall('/api/admin/bot/stop')} busy={busy} />
          <ConfigPanel config={cfg} onSave={(c) => apiCall('/api/admin/bot/config', 'POST', c)} />
        </div>

        {/* Cost Calculator */}
        <CostCalculator costs={costs} config={cfg} />

        {/* Fund from Phantom */}
        <PhantomFunding wallets={wallets} onRefresh={fetchAll} />

        {/* Wallets */}
        <WalletSection wallets={wallets} h={h} onRefresh={fetchAll} apiCall={apiCall} />

        {/* Tx Log */}
        <TxLog transactions={status?.recent_transactions || []} />
      </div>
      <Toaster />
    </div>
  );
}

const ProgressBar = ({ pct }) => (
  <div className="w-full bg-[rgba(255,255,255,0.05)] h-1.5 rounded mt-2">
    <div className="h-full bg-[#00FFD1] rounded transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
  </div>
);

const StatCard = ({ icon, label, value, color = 'text-[#00FFD1]' }) => (
  <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] p-4 rounded">
    <div className="flex items-center gap-2 text-[#444] mb-2">{icon}<span className="text-xs uppercase">{label}</span></div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

function BotControls({ running, stats, onStart, onStop, busy }) {
  const uptime = stats?.started_at ? Math.floor((Date.now() / 1000 - stats.started_at) / 60) : 0;
  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-[#00FFD1]" />Kontrola Bota</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button data-testid="bot-start-btn" onClick={onStart} disabled={running || busy} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12">
            <Play className="w-4 h-4 mr-2" />Start
          </Button>
          <Button data-testid="bot-stop-btn" onClick={onStop} disabled={!running || busy} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12">
            <Square className="w-4 h-4 mr-2" />Stop
          </Button>
        </div>
        {running && (
          <div className="bg-green-500/5 border border-green-500/20 p-3 rounded text-sm space-y-1">
            <Row l="Czas pracy" v={`${uptime} min`} vc="text-green-400" />
            <Row l="Cykle" v={stats?.cycles || 0} />
            <Row l="Wolumen total" v={`${(stats?.total_volume_sol || 0).toFixed(4)} SOL`} />
            <Row l="Ostatni trade" v={stats?.last_trade_time ? new Date(stats.last_trade_time * 1000).toLocaleTimeString() : '-'} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Row = ({ l, v, vc = 'text-white' }) => (
  <div className="flex justify-between"><span className="text-[#666]">{l}:</span><span className={vc}>{v}</span></div>
);

function ConfigPanel({ config, onSave }) {
  const [f, setF] = useState({});
  const [dirty, setDirty] = useState(false);
  const initRef = React.useRef(false);

  useEffect(() => {
    if (config && !dirty) {
      setF({ ...config });
      initRef.current = true;
    }
  }, [config, dirty]);

  const set = (k, v) => { setDirty(true); setF(p => ({ ...p, [k]: v })); };

  const handleSave = async () => {
    await onSave(f);
    setDirty(false);
  };

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#00FFD1]" />Konfiguracja
          {dirty && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded ml-2">Niezapisane</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-[#666] mb-1 block">Token Mint Address</label>
          <Input value={f.token_mint || ''} onChange={e => set('token_mint', e.target.value)} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10 font-mono text-xs" placeholder="Token address..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target Volume (SOL/dzien)" value={f.target_volume_sol} onChange={v => set('target_volume_sol', parseFloat(v))} step="1" />
          <Field label="Target Makers (/dzien)" value={f.target_makers} onChange={v => set('target_makers', parseInt(v))} step="1" />
          <Field label="Przerwa min (sekundy)" value={f.trade_interval_min} onChange={v => set('trade_interval_min', parseFloat(v))} step="1" />
          <Field label="Przerwa max (sekundy)" value={f.trade_interval_max} onChange={v => set('trade_interval_max', parseFloat(v))} step="1" />
          <Field label="Min SOL / trade" value={f.min_sol_per_trade} onChange={v => set('min_sol_per_trade', parseFloat(v))} step="0.001" />
          <Field label="Max SOL / trade" value={f.max_sol_per_trade} onChange={v => set('max_sol_per_trade', parseFloat(v))} step="0.001" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slippage (bps) - 100 = 1%" value={f.slippage_bps} onChange={v => set('slippage_bps', parseInt(v))} step="10" />
          <Field label="Min saldo portfela (SOL)" value={f.min_wallet_balance} onChange={v => set('min_wallet_balance', parseFloat(v))} step="0.001" />
        </div>
        <div className="flex items-center gap-3 py-2">
          <button
            onClick={() => set('auto_refund', !f.auto_refund)}
            className={`w-10 h-5 rounded-full transition-colors relative ${f.auto_refund ? 'bg-[#00FFD1]' : 'bg-[#333]'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${f.auto_refund ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-white">Auto-refund (automatyczne przeladowanie portfeli)</span>
        </div>
        <Button data-testid="save-config-btn" onClick={handleSave} className={`w-full h-10 ${dirty ? 'btn-primary' : 'bg-[#333] text-[#888] cursor-default'}`}>
          {dirty ? 'Zapisz konfiguracje' : 'Konfiguracja aktualna'}
        </Button>
      </CardContent>
    </Card>
  );
}

const Field = ({ label, value, onChange, step = "1" }) => (
  <div>
    <label className="text-xs text-[#666] mb-1 block">{label}</label>
    <Input type="number" step={step} value={value ?? ''} onChange={e => onChange(e.target.value)} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
  </div>
);

function CostCalculator({ costs, config }) {
  if (!costs) return null;
  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Calculator className="w-5 h-5 text-[#00FFD1]" />Kalkulator Kosztow</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CostItem label="Transakcje / dzien" value={`${costs.trades_per_day} (${costs.total_transactions} tx)`} />
          <CostItem label="Gas fees / dzien" value={`${costs.gas_cost_sol} SOL`} sub="~$0.01" />
          <CostItem label="Slippage / dzien" value={`${costs.slippage_cost_sol} SOL`} sub={`przy ${(config?.slippage_bps || 0) / 100}% slippage`} highlight />
          <CostItem label="TOTAL koszt / dzien" value={`${costs.total_daily_cost_sol} SOL`} sub={`${costs.cost_per_1sol_volume} SOL per 1 SOL volume`} highlight />
        </div>
        <div className="mt-4 bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.15)] p-3 rounded">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-[#00FFD1]" />
            <span className="text-[#888]">Minimalny SOL potrzebny:</span>
            <span className="font-bold text-[#00FFD1]">{costs.sol_needed_minimum} SOL</span>
            <span className="text-[#555]">(avg trade: {costs.avg_trade_size} SOL)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CostItem = ({ label, value, sub, highlight }) => (
  <div className={`p-3 rounded border ${highlight ? 'border-[rgba(0,255,209,0.2)] bg-[rgba(0,255,209,0.03)]' : 'border-[rgba(255,255,255,0.05)] bg-black/30'}`}>
    <p className="text-xs text-[#666] mb-1">{label}</p>
    <p className={`font-bold ${highlight ? 'text-[#00FFD1]' : 'text-white'}`}>{value}</p>
    {sub && <p className="text-xs text-[#555] mt-0.5">{sub}</p>}
  </div>
);

function WalletSection({ wallets, h, onRefresh, apiCall }) {
  const [label, setLabel] = useState('');
  const [pk, setPk] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [distSol, setDistSol] = useState(0.005);
  const [adding, setAdding] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectingFtrx, setCollectingFtrx] = useState(false);

  const addWallet = async (e) => {
    e.preventDefault();
    if (!label || !pk) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/admin/wallets`, { method: 'POST', headers: h, body: JSON.stringify({ label, private_key: pk }) });
      const d = await r.json();
      if (d.success) { toast.success(`Portfel: ${d.public_key.slice(0, 8)}...`); setLabel(''); setPk(''); onRefresh(); }
      else toast.error(d.error || 'Blad');
    } catch { toast.error('Blad'); }
    setAdding(false);
  };

  const pollStatus = async (endpoint, setLoading) => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const r = await fetch(`${API}${endpoint}`, { headers: { 'x-admin-password': h['x-admin-password'] } });
        const d = await r.json();
        if (!d.running) {
          if (d.result?.error) toast.error(d.result.error);
          else if (d.result?.sent !== undefined) toast.success(`Rozdzielono na ${d.result.sent}/${d.result.total} portfeli (${d.result.total_sol_sent} SOL)`);
          else if (d.result?.total_collected_sol !== undefined) toast.success(`Zebrano ${d.result.total_collected_sol} SOL z ${d.result.wallets_processed} portfeli`);
          else toast.success('Operacja zakonczona');
          setLoading(false);
          onRefresh();
          return;
        }
      } catch { /* continue polling */ }
    }
    toast.error('Timeout - sprawdz status portfeli');
    setLoading(false);
    onRefresh();
  };

  const handleDistribute = async () => {
    setDistributing(true);
    await apiCall('/api/admin/wallets/distribute', 'POST', { sol_per_wallet: distSol });
    pollStatus('/api/admin/wallets/distribute/status', setDistributing);
  };

  const handleCollect = async () => {
    setCollecting(true);
    await apiCall('/api/admin/wallets/collect', 'POST');
    pollStatus('/api/admin/wallets/collect/status', setCollecting);
  };

  const handleCollectFtrx = async () => {
    setCollectingFtrx(true);
    await apiCall('/api/admin/wallets/collect-ftrx', 'POST');
    pollStatus('/api/admin/wallets/collect-ftrx/status', setCollectingFtrx);
  };

  const totalBal = wallets.reduce((s, w) => s + (w.balance_sol || 0), 0);
  const totalFtrx = wallets.reduce((s, w) => s + (w.balance_ftrx || 0), 0);
  const mainWallet = wallets.find(w => w.is_main);
  const subWallets = wallets.filter(w => !w.is_main);

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#00FFD1]" />Portfele ({wallets.length})
            <span className="text-sm font-normal text-[#666]">| {totalBal.toFixed(4)} SOL | {totalFtrx > 0 ? `${totalFtrx.toFixed(2)} FTRX` : '0 FTRX'}</span>
          </CardTitle>
          <Button
            data-testid="refresh-ftrx-btn"
            onClick={() => apiCall('/api/admin/wallets/refresh-ftrx', 'POST')}
            variant="ghost"
            className="text-orange-400/60 hover:text-orange-400 text-xs h-8 px-3"
          >
            <Coins className="w-3.5 h-3.5 mr-1" />Odswiez FTRX
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-generate */}
        <div className="bg-black/50 p-4 rounded border border-[rgba(255,255,255,0.05)] space-y-3">
          <p className="text-sm text-[#888] flex items-center gap-2"><Zap className="w-4 h-4 text-[#00FFD1]" />Auto-generowanie portfeli</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-[#666] mb-1 block">Ilosc portfeli</label>
              <Input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value) || 1)} min="1" max="50" className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
            </div>
            <Button data-testid="generate-wallets-btn" onClick={() => apiCall('/api/admin/wallets/generate', 'POST', { count: genCount, prefix: 'Bot' })} className="btn-primary h-10 px-6">
              <Plus className="w-4 h-4 mr-1" />Generuj {genCount}
            </Button>
          </div>
        </div>

        {/* Distribute / Collect */}
        {wallets.length > 1 && (
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-black/50 p-4 rounded border border-[rgba(255,255,255,0.05)] space-y-2">
              <p className="text-sm text-[#888] flex items-center gap-2"><Upload className="w-4 h-4 text-[#00FFD1]" />Rozdziel SOL (z glownego)</p>
              {!mainWallet && <p className="text-xs text-yellow-500">Oznacz portfel jako glowny</p>}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-[#666] mb-1 block">SOL na portfel</label>
                  <Input type="number" step="0.001" value={distSol} onChange={e => setDistSol(parseFloat(e.target.value))} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
                </div>
                <Button data-testid="distribute-sol-btn" disabled={!mainWallet || distributing} onClick={handleDistribute} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4">
                  {distributing ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" />Rozdzielam...</> : 'Rozdziel'}
                </Button>
              </div>
              {mainWallet && <p className="text-xs text-[#555]">Total: {(distSol * (wallets.length - 1)).toFixed(3)} SOL na {wallets.length - 1} portfeli</p>}
            </div>
            <div className="bg-black/50 p-4 rounded border border-[rgba(255,255,255,0.05)] space-y-2 flex flex-col">
              <p className="text-sm text-[#888] flex items-center gap-2"><Download className="w-4 h-4 text-[#00FFD1]" />Zbierz do glownego</p>
              {!mainWallet && <p className="text-xs text-yellow-500">Oznacz portfel jako glowny</p>}
              <div className="flex-1" />
              <div className="space-y-2">
                <Button data-testid="collect-sol-btn" disabled={!mainWallet || collecting} onClick={handleCollect} className="bg-purple-600 hover:bg-purple-700 text-white h-10 w-full">
                  {collecting ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Zbieram SOL...</> : <><Download className="w-4 h-4 mr-2" />Zbierz caly SOL</>}
                </Button>
                <Button data-testid="collect-ftrx-btn" disabled={!mainWallet || collectingFtrx} onClick={handleCollectFtrx} className="bg-orange-600 hover:bg-orange-700 text-white h-10 w-full">
                  {collectingFtrx ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Zbieram FTRX...</> : <><Coins className="w-4 h-4 mr-2" />Zbierz caly FTRX</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Manual add */}
        <details className="bg-black/50 rounded border border-[rgba(255,255,255,0.05)]">
          <summary className="p-4 text-sm text-[#888] cursor-pointer flex items-center gap-2"><Plus className="w-4 h-4" />Dodaj portfel recznie</summary>
          <form onSubmit={addWallet} className="px-4 pb-4 space-y-3">
            <Input placeholder="Nazwa portfela" value={label} onChange={e => setLabel(e.target.value)} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
            <div className="relative">
              <Input data-testid="wallet-private-key-input" type={showKey ? 'text' : 'password'} placeholder="Klucz prywatny (base58 lub JSON)" value={pk} onChange={e => setPk(e.target.value)} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10 pr-10" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666]">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-start gap-2 text-xs text-yellow-500/80"><AlertTriangle className="w-3 h-3 mt-0.5" /><span>Uzyj portfeli przeznaczonych tylko do bota</span></div>
            <Button data-testid="add-wallet-btn" type="submit" disabled={adding || !label || !pk} className="btn-primary w-full h-10">{adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Dodaj'}</Button>
          </form>
        </details>

        {/* Wallet list */}
        {wallets.length === 0 ? (
          <p className="text-center text-[#444] text-sm py-4">Brak portfeli. Wygeneruj lub dodaj recznie.</p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {wallets.map(w => (
              <div key={w.public_key} className={`flex items-center justify-between p-3 rounded border ${w.is_main ? 'border-[rgba(0,255,209,0.3)] bg-[rgba(0,255,209,0.03)]' : 'border-[rgba(255,255,255,0.05)] bg-black/20'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{w.label}</p>
                    {w.is_main && <span className="text-[8px] bg-[#00FFD1] text-black px-1.5 py-0.5 rounded font-bold">GLOWNY</span>}
                  </div>
                  <p className="text-xs text-[#555] font-mono truncate">{w.public_key}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-[#00FFD1] block">{(w.balance_sol || 0).toFixed(4)} <span className="text-[10px] text-[#666]">SOL</span></span>
                    {(w.balance_ftrx || 0) > 0 && <span className="text-xs font-medium text-orange-400">{(w.balance_ftrx).toFixed(2)} <span className="text-[10px] text-[#666]">FTRX</span></span>}
                  </div>
                  {!w.is_main && (
                    <button onClick={() => { fetch(`${API}/api/admin/wallets/${w.public_key}/main`, { method: 'POST', headers: h }).then(() => { toast.success('Glowny portfel ustawiony'); onRefresh(); }); }} title="Ustaw jako glowny" className="text-yellow-500/50 hover:text-yellow-400 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={async () => { await fetch(`${API}/api/admin/wallets/${w.public_key}`, { method: 'DELETE', headers: h }); toast.success('Usuniety'); onRefresh(); }} className="text-red-400/50 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PhantomFunding({ wallets, onRefresh }) {
  const { publicKey, connected, signTransaction, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [fundAmount, setFundAmount] = useState(0.1);
  const [fundMode, setFundMode] = useState('main'); // 'main' or 'all'
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (publicKey && connection) {
      connection.getBalance(publicKey).then(b => setBalance(b / LAMPORTS_PER_SOL)).catch(() => {
        // Fallback: try via backend proxy
        fetch(`${API}/api/solana/rpc`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [publicKey.toString()] })
        }).then(r => r.json()).then(d => {
          if (d.result) setBalance(d.result.value / LAMPORTS_PER_SOL);
        }).catch(() => {});
      });
    } else {
      setBalance(null);
    }
  }, [publicKey, connection]);

  const mainWallet = wallets.find(w => w.is_main);
  const subWallets = wallets.filter(w => !w.is_main);

  const fundWallets = async () => {
    if (!publicKey || !connected) return;

    const targets = fundMode === 'main'
      ? (mainWallet ? [mainWallet] : [])
      : (subWallets.length > 0 ? subWallets : wallets);

    if (targets.length === 0) {
      toast.error('Brak portfeli docelowych. Wygeneruj portfele i oznacz glowny.');
      return;
    }

    setSending(true);
    try {
      const lamportsPerWallet = Math.floor(fundAmount * LAMPORTS_PER_SOL);

      // Get blockhash via backend proxy (avoids 403)
      const bhResp = await fetch(`${API}/api/solana/rpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'finalized' }] })
      });
      const bhData = await bhResp.json();
      if (!bhData.result) throw new Error('Nie udalo sie pobrac blockhash');

      const blockhash = bhData.result.value.blockhash;
      const lastValidBlockHeight = bhData.result.value.lastValidBlockHeight;

      // Build transaction
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = publicKey;

      for (const w of targets) {
        tx.add(SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(w.public_key),
          lamports: lamportsPerWallet,
        }));
      }

      // Sign with Phantom (only signs, no send)
      const signed = await signTransaction(tx);

      // Send via backend proxy
      const serialized = signed.serialize().toString('base64');
      const sendResp = await fetch(`${API}/api/solana/rpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sendTransaction', params: [serialized, { encoding: 'base64' }] })
      });
      const sendData = await sendResp.json();

      if (sendData.error) {
        throw new Error(sendData.error.message || JSON.stringify(sendData.error));
      }

      const sig = sendData.result;
      toast.success(`Wyslano ${(fundAmount * targets.length).toFixed(4)} SOL do ${targets.length} portfeli!`, {
        description: `Tx: ${sig.slice(0, 20)}...`
      });

      setTimeout(onRefresh, 3000);
      // Refresh balance
      setTimeout(async () => {
        try {
          const bResp = await fetch(`${API}/api/solana/rpc`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [publicKey.toString()] })
          });
          const bData = await bResp.json();
          if (bData.result) setBalance(bData.result.value / LAMPORTS_PER_SOL);
        } catch {}
      }, 3000);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Transakcja odrzucona');
    }
    setSending(false);
  };

  const totalToSend = fundMode === 'main'
    ? fundAmount
    : fundAmount * (subWallets.length > 0 ? subWallets.length : wallets.length);

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(0,255,209,0.2)]">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Link2 className="w-5 h-5 text-[#00FFD1]" />
          Zasilanie Portfeli - Phantom / Solflare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto rounded-full">
              <Wallet className="w-8 h-8 text-[#00FFD1]" />
            </div>
            <p className="text-[#888] text-sm">Polacz portfel Phantom/Solflare aby wyslac SOL do portfeli bota</p>
            <Button
              data-testid="connect-phantom-btn"
              onClick={() => setVisible(true)}
              className="btn-primary h-12 px-8 mx-auto"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Polacz Portfel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected wallet info */}
            <div className="flex items-center justify-between bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-4 rounded">
              <div>
                <p className="text-xs text-[#666] mb-1">Polaczony portfel</p>
                <p className="text-sm font-mono text-white">{publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#666] mb-1">Saldo</p>
                <p className="text-xl font-bold text-[#00FFD1]">{balance !== null ? `${balance.toFixed(4)} SOL` : '...'}</p>
              </div>
              <Button onClick={disconnect} variant="ghost" className="text-red-400/60 hover:text-red-400 text-xs ml-4">
                Rozlacz
              </Button>
            </div>

            {/* Fund options */}
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs text-[#666] mb-1 block">Wyslij do</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFundMode('main')}
                    className={`flex-1 text-sm py-2 px-3 rounded border transition-colors ${fundMode === 'main' ? 'border-[#00FFD1] bg-[rgba(0,255,209,0.1)] text-[#00FFD1]' : 'border-[rgba(255,255,255,0.1)] text-[#666]'}`}
                  >
                    Glowny portfel
                  </button>
                  <button
                    onClick={() => setFundMode('all')}
                    className={`flex-1 text-sm py-2 px-3 rounded border transition-colors ${fundMode === 'all' ? 'border-[#00FFD1] bg-[rgba(0,255,209,0.1)] text-[#00FFD1]' : 'border-[rgba(255,255,255,0.1)] text-[#666]'}`}
                  >
                    Wszystkie ({subWallets.length || wallets.length})
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#666] mb-1 block">SOL {fundMode === 'all' ? 'na portfel' : ''}</label>
                <Input
                  data-testid="fund-amount-input"
                  type="number" step="0.01" min="0.001"
                  value={fundAmount}
                  onChange={e => setFundAmount(parseFloat(e.target.value) || 0)}
                  className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10"
                />
              </div>
              <Button
                data-testid="fund-wallets-btn"
                onClick={fundWallets}
                disabled={sending || fundAmount <= 0 || wallets.length === 0}
                className="bg-gradient-to-r from-[#00FFD1] to-[#00CC99] text-black font-bold h-10 hover:opacity-90"
              >
                {sending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Wyslij {totalToSend.toFixed(3)} SOL
              </Button>
            </div>

            {/* Info */}
            {fundMode === 'main' && !mainWallet && (
              <p className="text-xs text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Oznacz portfel jako glowny (gwiazdka) w sekcji ponizej</p>
            )}
            {fundMode === 'all' && wallets.length > 0 && (
              <p className="text-xs text-[#555]">
                Total: {totalToSend.toFixed(4)} SOL na {subWallets.length || wallets.length} portfeli
                ({fundAmount} SOL kazdy)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TxLog({ transactions }) {
  const rev = [...(transactions || [])].reverse();
  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-[#00FFD1]" />Log Transakcji ({transactions.length})</CardTitle></CardHeader>
      <CardContent>
        {rev.length === 0 ? (
          <p className="text-center text-[#444] text-sm py-4">Brak transakcji. Uruchom bota.</p>
        ) : (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr className="text-[#666] text-xs border-b border-[rgba(255,255,255,0.05)]">
                  <th className="text-left py-2 px-2">Typ</th>
                  <th className="text-left py-2 px-2">SOL</th>
                  <th className="text-left py-2 px-2">Portfel</th>
                  <th className="text-left py-2 px-2">Sygnatura / Blad</th>
                  <th className="text-left py-2 px-2">Czas</th>
                </tr>
              </thead>
              <tbody>
                {rev.slice(0, 50).map((tx, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td className="py-2 px-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tx.type === 'BUY' ? 'bg-green-500/10 text-green-400' : tx.type === 'SELL' ? 'bg-blue-500/10 text-blue-400' : tx.type === 'TRANSFER' ? 'bg-yellow-500/10 text-yellow-400' : tx.type === 'REFUND' ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>{tx.type}</span>
                    </td>
                    <td className="py-2 px-2 text-white font-mono">{tx.sol_amount}</td>
                    <td className="py-2 px-2 text-[#888]">{tx.wallet}</td>
                    <td className="py-2 px-2 font-mono text-xs max-w-[200px] truncate">
                      {tx.error ? <span className="text-red-400">{tx.error}</span> :
                        tx.signature ? <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer" className="text-[#00FFD1] hover:underline">{tx.signature.slice(0, 16)}...</a> : '-'}
                    </td>
                    <td className="py-2 px-2 text-[#666]">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const TYPE_COLORS = { BUY: '#22c55e', SELL: '#3b82f6', TRANSFER: '#eab308', REFUND: '#a855f7', ERROR: '#ef4444' };

function ActivityChart({ transactions }) {
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return transactions.map((tx, i) => ({
      idx: i,
      time: tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `#${i}`,
      sol: tx.sol_amount || 0,
      type: tx.type,
      wallet: tx.wallet,
      color: TYPE_COLORS[tx.type] || '#666',
    }));
  }, [transactions]);

  const typeCounts = useMemo(() => {
    const counts = { BUY: 0, SELL: 0, TRANSFER: 0, REFUND: 0, ERROR: 0 };
    (transactions || []).forEach(tx => { counts[tx.type] = (counts[tx.type] || 0) + 1; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([type, count]) => ({ type, count, fill: TYPE_COLORS[type] }));
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return (
      <Card data-testid="activity-chart" className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
        <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#00FFD1]" />Aktywnosc Bota</CardTitle></CardHeader>
        <CardContent><p className="text-center text-[#444] text-sm py-8">Brak danych. Uruchom bota aby zobaczyc wykres aktywnosci.</p></CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#111] border border-[rgba(255,255,255,0.15)] rounded p-2 text-xs">
        <p className="font-bold" style={{ color: d.color }}>{d.type}</p>
        <p className="text-white">{d.sol} SOL</p>
        <p className="text-[#888]">{d.wallet}</p>
        <p className="text-[#555]">{d.time}</p>
      </div>
    );
  };

  return (
    <Card data-testid="activity-chart" className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00FFD1]" />Aktywnosc Bota
          <span className="text-sm font-normal text-[#666] ml-2">({transactions.length} transakcji)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-4 gap-4">
          {/* Timeline chart */}
          <div className="md:col-span-3">
            <p className="text-xs text-[#666] mb-2">Kwoty transakcji w czasie (SOL)</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis dataKey="time" tick={{ fill: '#555', fontSize: 10 }} interval="preserveStartEnd" axisLine={{ stroke: '#222' }} tickLine={false} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#222' }} tickLine={false} width={50} tickFormatter={v => v.toFixed(3)} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="sol" radius={[2, 2, 0, 0]} maxBarSize={16}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Type distribution */}
          <div>
            <p className="text-xs text-[#666] mb-2">Rozklad typow</p>
            <div className="space-y-2">
              {typeCounts.map(({ type, count, fill }) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: fill }} />
                    <span className="text-xs text-[#888]">{type}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: fill }}>{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeCounts} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="type" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {typeCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


const BOT_CONFIG_FIELDS = {
  spread: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'spread_percent', label: 'Spread (%)', type: 'number', step: 0.1 },
    { key: 'max_position_sol', label: 'Max pozycja (SOL)', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'min_sol_per_trade', label: 'Min SOL/trade', type: 'number', step: 0.001 },
    { key: 'max_sol_per_trade', label: 'Max SOL/trade', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 0.1 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 0.1 },
  ],
  sniper: [
    { key: 'token_mint', label: 'Token Mint (opcjonalny - puste = auto-discovery)', type: 'text' },
    { key: 'max_buy_sol', label: 'Max SOL/snipe', type: 'number', step: 0.01 },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 1 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 1 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'min_liquidity_usd', label: 'Min płynność (USD)', type: 'number' },
    { key: 'max_liquidity_usd', label: 'Max płynność (USD)', type: 'number' },
    { key: 'max_pool_age_seconds', label: 'Max wiek puli (s) - 3600=1h', type: 'number' },
    { key: 'max_concurrent_positions', label: 'Max otwartych pozycji', type: 'number' },
  ],
  trade: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'strategy', label: 'Strategia', type: 'select', options: ['momentum', 'mean_reversion', 'dca'] },
    { key: 'buy_threshold_percent', label: 'Próg BUY (%)', type: 'number', step: 0.5 },
    { key: 'sell_threshold_percent', label: 'Próg SELL (%)', type: 'number', step: 0.5 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 1 },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 1 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'min_sol_per_trade', label: 'Min SOL/trade', type: 'number', step: 0.001 },
    { key: 'max_sol_per_trade', label: 'Max SOL/trade', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'max_open_positions', label: 'Max pozycji', type: 'number' },
    { key: 'dca_interval_minutes', label: 'DCA interwał (min)', type: 'number' },
  ],
  arbitrage: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'min_profit_percent', label: 'Min profit (%)', type: 'number', step: 0.1 },
    { key: 'max_trade_sol', label: 'Max SOL/arb', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
  ],
  copytrade: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'target_wallet', label: 'Portfel wieloryba', type: 'text' },
    { key: 'max_sol_per_trade', label: 'Max SOL/trade', type: 'number', step: 0.01 },
    { key: 'copy_ratio', label: 'Stosunek kopii (0-1)', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'min_whale_trade_sol', label: 'Min whale trade (SOL)', type: 'number', step: 0.01 },
  ],
  holder: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'sol_per_buy', label: 'SOL per zakup (na portfel)', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
  ],
};

function GenericBotDashboard({ botType, pw, onBack }) {
  const botInfo = OTHER_BOTS.find(b => b.id === botType);
  const [status, setStatus] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [distAmount, setDistAmount] = useState(0.005);
  const [fundAmount, setFundAmount] = useState(0.1);
  const [holdings, setHoldings] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': pw };
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const fetchData = useCallback(async () => {
    try {
      const [sR, wR] = await Promise.all([
        fetch(`${API}/api/admin/bot/${botType}/status`, { headers }),
        fetch(`${API}/api/admin/bot/${botType}/wallets`, { headers }),
      ]);
      if (sR.ok) { const d = await sR.json(); setStatus(d); setConfig(d.config || {}); }
      if (wR.ok) { const d = await wR.json(); setWallets(d.wallets || []); }
    } catch {}
  }, [botType, pw]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 5000); return () => clearInterval(i); }, [fetchData]);

  const startBot = async () => { await fetch(`${API}/api/admin/bot/${botType}/start`, { method: 'POST', headers }); toast.success('Bot uruchomiony'); fetchData(); };
  const stopBot = async () => { await fetch(`${API}/api/admin/bot/${botType}/stop`, { method: 'POST', headers }); toast.success('Bot zatrzymany'); fetchData(); };
  const saveConfig = async () => { 
    const r = await fetch(`${API}/api/admin/bot/${botType}/config`, { method: 'POST', headers, body: JSON.stringify(config) }); 
    if (r.ok) { const d = await r.json(); if (d.config) setConfig(d.config); toast.success('Zapisano'); }
    else toast.error('Blad zapisu');
  };
  const generateWallets = async () => { setLoading(true); await fetch(`${API}/api/admin/bot/${botType}/wallets/generate`, { method: 'POST', headers, body: JSON.stringify({ count: genCount, prefix: botInfo?.name?.split(' ')[0] || 'Bot' }) }); fetchData(); setLoading(false); toast.success('Wygenerowano'); };
  const distributeSol = async () => { await fetch(`${API}/api/admin/bot/${botType}/wallets/distribute`, { method: 'POST', headers, body: JSON.stringify({ sol_per_wallet: distAmount }) }); toast.success('Dystrybucja rozpoczęta'); };
  const collectSol = async () => { await fetch(`${API}/api/admin/bot/${botType}/wallets/collect`, { method: 'POST', headers }); toast.success('Zbieranie SOL'); };

  const fetchHoldings = async () => {
    if (botType !== 'sniper') return;
    setHoldingsLoading(true);
    try {
      const [hR, histR] = await Promise.all([
        fetch(`${API}/api/admin/bot/sniper/holdings`, { headers }),
        fetch(`${API}/api/admin/bot/sniper/history`, { headers }),
      ]);
      if (hR.ok) { const d = await hR.json(); setHoldings(d.holdings || []); }
      if (histR.ok) { const d = await histR.json(); setTradeHistory(d.history || []); }
    } catch {}
    setHoldingsLoading(false);
  };

  const sellToken = async (token_mint, wallet) => {
    try {
      const r = await fetch(`${API}/api/admin/bot/sniper/sell`, {
        method: 'POST', headers, body: JSON.stringify({ token_mint, wallet })
      });
      const d = await r.json();
      if (d.success) { toast.success(`Sprzedano! ${d.sol_received?.toFixed(4)} SOL`); fetchHoldings(); fetchData(); }
      else toast.error(d.error || 'Blad sprzedazy');
    } catch (e) { toast.error('Blad: ' + e.message); }
  };

  const stats = status?.stats || {};
  const txs = status?.recent_transactions || [];
  const running = status?.running || false;
  const totalSol = wallets.reduce((s, w) => s + (w.balance_sol || 0), 0);
  const totalToken = wallets.reduce((s, w) => s + (w.balance_token || 0), 0);
  const fields = BOT_CONFIG_FIELDS[botType] || [];
  const txColors = { BUY: '#00FF88', SELL: '#FF4444', TRANSFER: '#4488FF', ERROR: '#666', SNIPE_BUY: '#FFD700', TAKE_PROFIT: '#00FF88', STOP_LOSS: '#FF4444', COPY_BUY: '#FF8844', COPY_SELL: '#FF4444', WHALE_BUY: '#FFD700', WHALE_SELL: '#FF8844', ARB_SUCCESS: '#00FF88', ARB_FAIL: '#FF4444', OPPORTUNITY: '#AA44FF', NEW_POOL: '#FFD700', REFUND: '#888' };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[rgba(255,255,255,0.1)] px-4 md:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-[#666] hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: `${botInfo?.color}22` }}>
              {botInfo && <botInfo.icon className="w-4 h-4" style={{ color: botInfo.color }} />}
            </div>
            <span className="text-lg font-bold" style={{ color: botInfo?.color }}>{botInfo?.name}</span>
            {running && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded animate-pulse">AKTYWNY</span>}
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded"><RefreshCw className="w-4 h-4 text-[#666]" /></button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">STATUS</p><p className={`font-bold text-lg ${running ? 'text-green-400' : 'text-red-400'}`}>{running ? 'Aktywny' : 'Zatrzymany'}</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">TRADES</p><p className="font-bold text-lg text-white">{stats.total_trades || stats.total_snipes || stats.total_arbs || stats.total_copies || 0}</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">PROFIT</p><p className={`font-bold text-lg ${(stats.profit_sol || stats.total_profit_sol || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(stats.profit_sol || stats.total_profit_sol || 0).toFixed(4)} SOL</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">ERRORS</p><p className="font-bold text-lg text-[#666]">{stats.errors || 0}</p></CardContent></Card>
        </div>


        {/* Sniper Holdings - real token balances from chain */}
        {botType === 'sniper' && (
          <Card className="bg-[#0a0a0a] border-[#FFD700]/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Crosshair className="w-4 h-4 text-[#FFD700]" /> Tokeny w portfelach ({holdings.length})</span>
                <Button onClick={fetchHoldings} disabled={holdingsLoading} variant="ghost" className="text-[#FFD700] text-xs">
                  {holdingsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Skanuj portfele'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {holdings.length > 0 ? (
                <div className="space-y-2">
                  {holdings.map((h, i) => (
                    <div key={i} className="bg-black/50 border border-[rgba(255,255,255,0.1)] rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 mr-3">
                          <p className="text-xs text-[#666]">Token Mint:</p>
                          <p className="text-xs text-[#FFD700] font-mono break-all select-all">{h.token_mint}</p>
                        </div>
                        <Button onClick={() => sellToken(h.token_mint, h.wallet)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 whitespace-nowrap">
                          Sprzedaj
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[#888]">
                        <span>Ilość: <span className="text-white font-bold">{h.balance?.toFixed(2)}</span></span>
                        {h.price_usd > 0 && <span>Cena: <span className="text-green-400">${h.price_usd?.toFixed(8)}</span></span>}
                        {h.value_usd > 0 && <span>Wartość: <span className="text-green-400">${h.value_usd?.toFixed(4)}</span></span>}
                        {h.liquidity_usd > 0 && <span>Płynność: <span className="text-blue-400">${h.liquidity_usd?.toFixed(0)}</span></span>}
                        <span>Portfel: <span className="text-white">{h.wallet_label || h.wallet?.substring(0,8)}</span></span>
                        <a href={`https://solscan.io/token/${h.token_mint}`} target="_blank" rel="noreferrer" className="text-[#00FFD1] hover:underline">Solscan</a>
                        <a href={`https://dexscreener.com/solana/${h.token_mint}`} target="_blank" rel="noreferrer" className="text-[#00FFD1] hover:underline">DexScreener</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#555] text-center py-3 text-sm">{holdingsLoading ? 'Skanowanie portfeli...' : 'Kliknij "Skanuj portfele" aby zobaczyć tokeny'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sniper Trade History */}
        {botType === 'sniper' && tradeHistory.length > 0 && (
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Historia Transakcji ({tradeHistory.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-[#666] border-b border-[rgba(255,255,255,0.1)]">
                    <th className="text-left py-2 px-2">Typ</th>
                    <th className="text-left py-2 px-2">Token Mint</th>
                    <th className="text-right py-2 px-2">SOL</th>
                    <th className="text-right py-2 px-2">Zysk/Strata</th>
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-left py-2 px-2">Tx</th>
                  </tr></thead>
                  <tbody>
                    {tradeHistory.map((h, i) => (
                      <tr key={i} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-white/5">
                        <td className="py-2 px-2">
                          <span className={`font-bold ${h.action === 'BUY' ? 'text-green-400' : h.action === 'SELL' ? 'text-red-400' : 'text-orange-400'}`}>{h.action}</span>
                        </td>
                        <td className="py-2 px-2 font-mono text-[#FFD700]">
                          <a href={`https://dexscreener.com/solana/${h.token_mint}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {h.token_mint?.substring(0,12)}...
                          </a>
                        </td>
                        <td className="py-2 px-2 text-right text-white">{h.sol_amount?.toFixed(4)}</td>
                        <td className="py-2 px-2 text-right">
                          {h.profit_sol !== undefined && h.profit_sol !== null ? (
                            <span className={h.profit_sol >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {h.profit_sol >= 0 ? '+' : ''}{h.profit_sol?.toFixed(4)} SOL
                            </span>
                          ) : <span className="text-[#555]">-</span>}
                        </td>
                        <td className="py-2 px-2 text-[#888]">{h.timestamp ? new Date(h.timestamp).toLocaleString('pl-PL') : '-'}</td>
                        <td className="py-2 px-2">
                          {h.tx_signature ? (
                            <a href={`https://solscan.io/tx/${h.tx_signature}`} target="_blank" rel="noreferrer" className="text-[#00FFD1] hover:underline">
                              {h.tx_signature.substring(0,8)}...
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Holder Bot - Preset buttons + Collect/Close */}
        {botType === 'holder' && (
          <Card className="bg-[#0a0a0a] border-[#00CCFF]/20">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#00CCFF]" /> Utwórz Holderów</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-[#888] mb-3">Wybierz ile holderów chcesz stworzyć (generuje portfele, rozdziela SOL, kupuje tokeny):</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[50, 100, 200, 250, 500, 750].map(n => (
                  <Button key={n} onClick={async () => {
                    if (!config.token_mint) { toast.error('Najpierw ustaw Token Mint!'); return; }
                    const existing = wallets.filter(w => !w.is_main).length;
                    const toGen = Math.max(0, n - existing);
                    if (toGen > 0) {
                      toast.info(`Generowanie ${toGen} portfeli...`);
                      await fetch(`${API}/api/admin/bot/holder/wallets/generate`, { method: 'POST', headers, body: JSON.stringify({ count: toGen, prefix: 'Holder' }) });
                    }
                    toast.info(`Uruchamianie zakupów dla ${n} holderów...`);
                    await fetch(`${API}/api/admin/bot/holder/start`, { method: 'POST', headers });
                    fetchData();
                  }} className="px-4 py-2 text-sm font-bold" style={{ background: '#00CCFF22', color: '#00CCFF', border: '1px solid #00CCFF33' }}>
                    {n} holderów
                  </Button>
                ))}
              </div>
              {/* Progress */}
              {stats.phase && stats.phase !== 'idle' && (
                <div className="mb-3 p-3 bg-black/50 rounded border border-[rgba(255,255,255,0.1)]">
                  <p className="text-xs text-[#00CCFF] font-bold mb-1">Faza: {stats.phase}</p>
                  <div className="w-full bg-gray-800 rounded h-2">
                    <div className="bg-[#00CCFF] h-2 rounded transition-all" style={{ width: `${stats.progress_total ? (stats.progress / stats.progress_total * 100) : 0}%` }}></div>
                  </div>
                  <p className="text-xs text-[#888] mt-1">{stats.progress}/{stats.progress_total} | Kupiono: {stats.wallets_bought} | Błędy: {stats.errors}</p>
                </div>
              )}
              {/* Collect + Close actions */}
              <div className="flex gap-2">
                <Button onClick={async () => {
                  toast.info('Zbieranie tokenów i SOL...');
                  const r = await fetch(`${API}/api/admin/bot/holder/collect-tokens`, { method: 'POST', headers });
                  const d = await r.json();
                  if (d.collected) toast.success(`Zebrano tokeny z ${d.collected} portfeli → ${d.total_sol?.toFixed(4)} SOL`);
                  else toast.info(d.error || 'Brak tokenów do zebrania');
                  fetchData();
                }} className="flex-1 bg-orange-700 hover:bg-orange-600 text-sm">
                  Zbierz tokeny → SOL
                </Button>
                <Button onClick={async () => {
                  toast.info('Zamykanie kont → odzyskiwanie rent...');
                  const r = await fetch(`${API}/api/admin/bot/holder/close-accounts`, { method: 'POST', headers });
                  const d = await r.json();
                  if (d.closed) toast.success(`Zamknięto ${d.closed} kont → odzyskano ~${d.rent_recovered_approx} SOL`);
                  else toast.info(d.error || 'Brak kont do zamknięcia');
                  fetchData();
                }} className="flex-1 bg-purple-700 hover:bg-purple-600 text-sm">
                  Zamknij konta → odzyskaj SOL
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Controls + Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Kontrola Bota</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Button onClick={startBot} disabled={running} className="flex-1 bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-2" /> Start</Button>
                <Button onClick={stopBot} disabled={!running} className="flex-1 bg-red-600 hover:bg-red-700"><Square className="w-4 h-4 mr-2" /> Stop</Button>
              </div>
              {txs.length > 0 && (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={txs.slice(-30)}>
                    <XAxis dataKey="time" tick={false} /><YAxis tick={false} />
                    <Bar dataKey="amount">{txs.slice(-30).map((t, i) => <Cell key={i} fill={txColors[t.type] || '#666'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Konfiguracja</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-[#666]">{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={config[f.key] || ''} onChange={e => setConfig({ ...config, [f.key]: e.target.value })} className="w-full bg-black border border-[rgba(255,255,255,0.15)] rounded px-3 py-2 text-white text-sm">
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={f.type} step={f.step} value={config[f.key] ?? ''} onChange={e => setConfig({ ...config, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} className="bg-black border-[rgba(255,255,255,0.15)] text-white" />
                  )}
                </div>
              ))}
              <Button onClick={saveConfig} className="w-full" style={{ background: botInfo?.color, color: '#000' }}>Zapisz konfigurację</Button>
            </CardContent>
          </Card>
        </div>

        {/* Wallets */}
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Portfele ({wallets.length}) | {totalSol.toFixed(4)} SOL{totalToken > 0 ? ` | ${totalToken.toFixed(2)} Token` : ''}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex gap-2"><Input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value)||1)} className="bg-black border-[rgba(255,255,255,0.15)] text-white w-20" /><Button onClick={generateWallets} disabled={loading} className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"><Plus className="w-4 h-4 mr-1" /> Generuj</Button></div>
              <div className="flex gap-2"><Input type="number" step={0.001} value={distAmount} onChange={e => setDistAmount(parseFloat(e.target.value)||0)} className="bg-black border-[rgba(255,255,255,0.15)] text-white w-24" /><Button onClick={distributeSol} className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]">Rozdziel</Button></div>
              <Button onClick={collectSol} className="bg-purple-700 hover:bg-purple-600">Zbierz caly SOL</Button>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {wallets.map(w => (
                <div key={w.public_key} className={`flex items-center justify-between py-2 px-2 rounded ${w.is_main ? 'border border-yellow-600/30 bg-yellow-900/10' : 'hover:bg-white/5'}`}>
                  <div className="flex items-center gap-2"><span className="text-sm">{w.label}</span>{w.is_main && <span className="text-[10px] bg-yellow-600 text-black px-1.5 rounded font-bold">GLOWNY</span>}<span className="text-xs text-[#555] truncate max-w-[200px]">{w.public_key}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-400">{(w.balance_sol||0).toFixed(4)} SOL</span>
                    {(w.balance_token||0) > 0 && <span className="text-sm text-orange-400">{(w.balance_token||0).toFixed(2)}</span>}
                    <button onClick={async () => { await fetch(`${API}/api/admin/bot/${botType}/wallets/${w.public_key}/main`, { method: 'POST', headers }); fetchData(); }} className="text-yellow-500/50 hover:text-yellow-400"><Star className="w-4 h-4" /></button>
                    <button onClick={async () => { await fetch(`${API}/api/admin/bot/${botType}/wallets/${w.public_key}`, { method: 'DELETE', headers }); fetchData(); }} className="text-red-400/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {wallets.length === 0 && <p className="text-[#555] text-center py-4">Brak portfeli. Wygeneruj nowe.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Wallet Funding - Phantom/Solflare */}
        <Card className="bg-[#0a0a0a] border-[#00FFD1]/20">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Link2 className="w-4 h-4 text-[#00FFD1]" /> Zasilanie Portfeli - Phantom / Solflare</CardTitle></CardHeader>
          <CardContent>
            {!publicKey ? (
              <Button onClick={() => setVisible(true)} className="w-full bg-[#00FFD1] text-black font-bold hover:bg-[#00DDC0]">
                <Wallet className="w-4 h-4 mr-2" /> Podlacz portfel
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#666]">Podlaczony: <span className="text-[#00FFD1]">{publicKey.toString().slice(0,8)}...{publicKey.toString().slice(-6)}</span></p>
                {(() => { const mainW = wallets.find(w => w.is_main); return mainW ? (
                  <div className="flex gap-2">
                    <Input type="number" step={0.01} value={fundAmount} onChange={e => setFundAmount(parseFloat(e.target.value)||0)} className="bg-black border-[rgba(255,255,255,0.15)] text-white w-32" />
                    <Button onClick={async () => {
                      try {
                        const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(mainW.public_key), lamports: Math.floor(fundAmount * LAMPORTS_PER_SOL) }));
                        await sendTransaction(tx, connection);
                        toast.success(`Wyslano ${fundAmount} SOL na glowny portfel`);
                        setTimeout(fetchData, 3000);
                      } catch(e) { toast.error('Blad: ' + e.message); }
                    }} className="flex-1 bg-[#00FFD1] text-black font-bold hover:bg-[#00DDC0]">
                      Wyslij {fundAmount} SOL na glowny portfel
                    </Button>
                  </div>
                ) : <p className="text-xs text-red-400">Najpierw wygeneruj portfele i ustaw glowny</p>; })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log */}
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Log Transakcji ({txs.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {txs.slice(-20).reverse().map((tx, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-2">
                    <span className="w-20 font-mono font-bold" style={{ color: txColors[tx.type] || '#666' }}>{tx.type}</span>
                    <span className="text-[#555]">{tx.wallet}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{tx.amount} SOL</span>
                    <span className="text-[#444] truncate max-w-[150px]">{tx.detail || tx.tx}</span>
                  </div>
                </div>
              ))}
              {txs.length === 0 && <p className="text-[#555] text-center py-4">Brak transakcji.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function AnalyticsDashboard({ pw, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = { 'x-admin-password': pw };

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/analytics`, { headers });
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  }, [pw]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sourceColors = { direct: '#00FFD1', google: '#4285F4', twitter: '#1DA1F2', telegram: '#0088cc', discord: '#5865F2', raydium: '#6366f1', jupiter: '#FF6B00', dexscreener: '#00FF88', facebook: '#1877F2', reddit: '#FF4500', youtube: '#FF0000', other: '#888' };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  const sources = data?.sources || {};
  const daily = data?.daily_visits || {};
  const topQ = data?.top_questions || [];
  const recentChats = data?.recent_chats || [];
  const dailyData = Object.entries(daily).sort().slice(-14).map(([d, c]) => ({ date: d.slice(5), visits: c }));

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[rgba(255,255,255,0.1)] px-4 md:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-[#666] hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            <span className="text-lg font-bold text-[#00FF88]">Analytics</span>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded"><RefreshCw className="w-4 h-4 text-[#666]" /></button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">ODWIEDZINY</p><p className="font-bold text-2xl text-white">{data?.total_visits || 0}</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">ZRODLA</p><p className="font-bold text-2xl text-white">{Object.keys(sources).length}</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">PYTANIA CHATBOTA</p><p className="font-bold text-2xl text-white">{data?.total_chats || 0}</p></CardContent></Card>
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]"><CardContent className="p-4"><p className="text-xs text-[#666]">UNIKALNE PYTANIA</p><p className="font-bold text-2xl text-white">{topQ.length}</p></CardContent></Card>
        </div>

        {/* Daily visits chart + Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Odwiedziny dzienne (14 dni)</CardTitle></CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData}>
                    <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #333' }} />
                    <Bar dataKey="visits" fill="#00FF88" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-[#555] text-center py-8">Brak danych - tracking rozpocznie się po redeploy</p>}
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Źródła ruchu</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(sources).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(sources).sort((a,b) => b[1]-a[1]).map(([src, count]) => (
                    <div key={src} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: sourceColors[src] || '#888' }}></div>
                        <span className="text-sm text-white capitalize">{src}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded" style={{ width: `${Math.max(20, count / Math.max(...Object.values(sources)) * 150)}px`, background: sourceColors[src] || '#888' }}></div>
                        <span className="text-sm text-[#888] w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[#555] text-center py-8">Brak danych</p>}
            </CardContent>
          </Card>
        </div>

        {/* Chat questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Najczęstsze pytania chatbota</CardTitle></CardHeader>
            <CardContent>
              {topQ.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {topQ.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.05)]">
                      <span className="text-sm text-white truncate mr-2">{q.question}</span>
                      <span className="text-xs text-[#00FFD1] font-bold whitespace-nowrap">{q.count}x</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[#555] text-center py-8">Brak pytań</p>}
            </CardContent>
          </Card>

          <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Ostatnie rozmowy chatbota</CardTitle></CardHeader>
            <CardContent>
              {recentChats.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentChats.map((c, i) => (
                    <div key={i} className="py-2 border-b border-[rgba(255,255,255,0.05)]">
                      <p className="text-xs text-[#888]">{c.timestamp ? new Date(c.timestamp).toLocaleString('pl-PL') : ''} ({c.language})</p>
                      <p className="text-sm text-[#FFD700]">Q: {c.question}</p>
                      <p className="text-xs text-[#666] truncate">A: {c.answer}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[#555] text-center py-8">Brak rozmów</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
