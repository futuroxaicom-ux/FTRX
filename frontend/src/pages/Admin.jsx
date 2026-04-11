import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Play, Square, RefreshCw, Plus, Trash2, Settings, Activity,
  Wallet, ArrowLeft, Lock, Eye, EyeOff, AlertTriangle,
  TrendingUp, Zap, XCircle, Star, Download, Upload,
  Calculator, Users, Clock, Target, Coins
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

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
            <CardTitle className="text-white text-2xl">Volume Bot Admin</CardTitle>
            <p className="text-[#666] text-sm mt-2">FTRX Volume Bot - Panel Administracyjny</p>
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

  return <Dashboard pw={pw} onLogout={() => { sessionStorage.removeItem('adm'); setAuthed(false); }} />;
}

function Dashboard({ pw, onLogout }) {
  const [status, setStatus] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [costs, setCosts] = useState(null);
  const [busy, setBusy] = useState(false);
  const h = { 'Content-Type': 'application/json', 'x-admin-password': pw };

  const fetchAll = useCallback(async () => {
    try {
      const [sR, wR, cR] = await Promise.all([
        fetch(`${API}/api/admin/bot/status`, { headers: h }),
        fetch(`${API}/api/admin/wallets`, { headers: h }),
        fetch(`${API}/api/admin/bot/costs`, { headers: h }),
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
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Transakcje / Bledy" value={`${stats.daily_trades || 0} / ${stats.errors || 0}`} color="text-white" />
        </div>

        {/* Controls + Config */}
        <div className="grid md:grid-cols-2 gap-4">
          <BotControls running={running} stats={stats} onStart={() => apiCall('/api/admin/bot/start')} onStop={() => apiCall('/api/admin/bot/stop')} busy={busy} />
          <ConfigPanel config={cfg} onSave={(c) => apiCall('/api/admin/bot/config', 'POST', c)} />
        </div>

        {/* Cost Calculator */}
        <CostCalculator costs={costs} config={cfg} />

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
          <Field label="Trade co (min) min" value={f.trade_interval_min} onChange={v => set('trade_interval_min', parseInt(v))} step="1" />
          <Field label="Trade co (min) max" value={f.trade_interval_max} onChange={v => set('trade_interval_max', parseInt(v))} step="1" />
          <Field label="Min SOL / trade" value={f.min_sol_per_trade} onChange={v => set('min_sol_per_trade', parseFloat(v))} step="0.001" />
          <Field label="Max SOL / trade" value={f.max_sol_per_trade} onChange={v => set('max_sol_per_trade', parseFloat(v))} step="0.001" />
        </div>
        <Field label="Slippage (bps) - 100 = 1%" value={f.slippage_bps} onChange={v => set('slippage_bps', parseInt(v))} step="10" />
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
  const [distSol, setDistSol] = useState(0.01);
  const [adding, setAdding] = useState(false);

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

  const totalBal = wallets.reduce((s, w) => s + (w.balance_sol || 0), 0);
  const mainWallet = wallets.find(w => w.is_main);

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#00FFD1]" />Portfele ({wallets.length})
            <span className="text-sm font-normal text-[#666]">| Total: {totalBal.toFixed(4)} SOL</span>
          </CardTitle>
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
                <Button data-testid="distribute-sol-btn" disabled={!mainWallet} onClick={() => apiCall('/api/admin/wallets/distribute', 'POST', { sol_per_wallet: distSol })} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4">
                  Rozdziel
                </Button>
              </div>
              {mainWallet && <p className="text-xs text-[#555]">Total: {(distSol * (wallets.length - 1)).toFixed(3)} SOL na {wallets.length - 1} portfeli</p>}
            </div>
            <div className="bg-black/50 p-4 rounded border border-[rgba(255,255,255,0.05)] space-y-2 flex flex-col">
              <p className="text-sm text-[#888] flex items-center gap-2"><Download className="w-4 h-4 text-[#00FFD1]" />Zbierz SOL (do glownego)</p>
              {!mainWallet && <p className="text-xs text-yellow-500">Oznacz portfel jako glowny</p>}
              <div className="flex-1" />
              <Button data-testid="collect-sol-btn" disabled={!mainWallet} onClick={() => apiCall('/api/admin/wallets/collect', 'POST')} className="bg-purple-600 hover:bg-purple-700 text-white h-10 w-full">
                <Download className="w-4 h-4 mr-2" />Zbierz caly SOL
              </Button>
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
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold text-[#00FFD1]">{(w.balance_sol || 0).toFixed(4)}</span>
                  {!w.is_main && (
                    <button onClick={() => { fetch(`${API}/api/admin/wallets/${w.public_key}/main`, { method: 'POST', headers: { 'x-admin-password': pw } }).then(() => { toast.success('Glowny portfel ustawiony'); onRefresh(); }); }} title="Ustaw jako glowny" className="text-yellow-500/50 hover:text-yellow-400 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={async () => { await fetch(`${API}/api/admin/wallets/${w.public_key}`, { method: 'DELETE', headers: { 'x-admin-password': pw } }); toast.success('Usuniety'); onRefresh(); }} className="text-red-400/50 hover:text-red-400 transition-colors">
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tx.type === 'BUY' ? 'bg-green-500/10 text-green-400' : tx.type === 'SELL' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{tx.type}</span>
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
