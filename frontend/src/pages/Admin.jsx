import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Play, Square, RefreshCw, Plus, Trash2, Star, ArrowLeft,
  Lock, Eye, EyeOff, Wallet, Settings, BarChart3, Target,
  Crosshair, TrendingUp, GitBranch, Copy, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL || '';

const BOT_TYPES = [
  { id: 'volume', name: 'Volume Bot', icon: BarChart3, color: '#00FFD1', desc: 'Generuj sztuczny wolumen' },
  { id: 'spread', name: 'Spread Bot', icon: TrendingUp, color: '#FFD700', desc: 'Market making - zarabiaj na spreadzie' },
  { id: 'sniper', name: 'Sniper Bot', icon: Crosshair, color: '#FF4444', desc: 'Snipuj nowe pule na Raydium' },
  { id: 'trade', name: 'Trade Bot', icon: Target, color: '#4488FF', desc: 'Auto-trading z strategiami' },
  { id: 'arbitrage', name: 'Arbitrage Bot', icon: GitBranch, color: '#AA44FF', desc: 'Arbitraz miedzy DEX-ami' },
  { id: 'copytrade', name: 'Copy Trade Bot', icon: Copy, color: '#FF8844', desc: 'Kopiuj transakcje wielorybow' },
];

const CONFIG_FIELDS = {
  volume: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'target_volume_sol', label: 'Target Volume (SOL/dzien)', type: 'number', step: 1 },
    { key: 'target_makers', label: 'Target Makers (/dzien)', type: 'number' },
    { key: 'trade_interval_min', label: 'Przerwa min (sekundy)', type: 'number' },
    { key: 'trade_interval_max', label: 'Przerwa max (sekundy)', type: 'number' },
    { key: 'min_sol_per_trade', label: 'Min SOL / trade', type: 'number', step: 0.001 },
    { key: 'max_sol_per_trade', label: 'Max SOL / trade', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'min_wallet_balance', label: 'Min saldo portfela (SOL)', type: 'number', step: 0.001 },
  ],
  spread: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'spread_percent', label: 'Spread (%)', type: 'number', step: 0.1 },
    { key: 'max_position_sol', label: 'Max pozycja (SOL)', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał sprawdzania (s)', type: 'number' },
    { key: 'min_sol_per_trade', label: 'Min SOL / trade', type: 'number', step: 0.001 },
    { key: 'max_sol_per_trade', label: 'Max SOL / trade', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 0.1 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 0.1 },
  ],
  sniper: [
    { key: 'token_mint', label: 'Token Mint (cel)', type: 'text' },
    { key: 'max_buy_sol', label: 'Max SOL per snipe', type: 'number', step: 0.01 },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 1 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 1 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'min_liquidity_usd', label: 'Min płynność (USD)', type: 'number' },
  ],
  trade: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'strategy', label: 'Strategia', type: 'select', options: ['momentum', 'mean_reversion', 'dca'] },
    { key: 'buy_threshold_percent', label: 'Próg BUY (%)', type: 'number', step: 0.5 },
    { key: 'sell_threshold_percent', label: 'Próg SELL (%)', type: 'number', step: 0.5 },
    { key: 'stop_loss_percent', label: 'Stop Loss (%)', type: 'number', step: 1 },
    { key: 'take_profit_percent', label: 'Take Profit (%)', type: 'number', step: 1 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'min_sol_per_trade', label: 'Min SOL / trade', type: 'number', step: 0.001 },
    { key: 'max_sol_per_trade', label: 'Max SOL / trade', type: 'number', step: 0.001 },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'max_open_positions', label: 'Max otwartych pozycji', type: 'number' },
    { key: 'dca_interval_minutes', label: 'DCA interwał (min)', type: 'number' },
  ],
  arbitrage: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'min_profit_percent', label: 'Min profit (%)', type: 'number', step: 0.1 },
    { key: 'max_trade_sol', label: 'Max SOL / arb', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
  ],
  copytrade: [
    { key: 'token_mint', label: 'Token Mint Address', type: 'text' },
    { key: 'target_wallet', label: 'Portfel wieloryba (adres)', type: 'text' },
    { key: 'max_sol_per_trade', label: 'Max SOL / trade', type: 'number', step: 0.01 },
    { key: 'copy_ratio', label: 'Stosunek kopii (0-1)', type: 'number', step: 0.01 },
    { key: 'check_interval', label: 'Interwał (s)', type: 'number' },
    { key: 'slippage_bps', label: 'Slippage (bps)', type: 'number' },
    { key: 'min_whale_trade_sol', label: 'Min whale trade (SOL)', type: 'number', step: 0.01 },
  ],
};

function BotDashboard({ botType, pw, onBack }) {
  const botInfo = BOT_TYPES.find(b => b.id === botType);
  const [status, setStatus] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [distAmount, setDistAmount] = useState(0.005);

  const headers = { 'Content-Type': 'application/json', 'x-admin-password': pw };
  const isVolume = botType === 'volume';
  const statusUrl = isVolume ? `${API}/api/admin/bot/status` : `${API}/api/admin/bot/${botType}/status`;
  const walletsUrl = isVolume ? `${API}/api/admin/wallets` : `${API}/api/admin/bot/${botType}/wallets`;

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(statusUrl, { headers });
      const d = await r.json();
      setStatus(d);
      setConfig(d.config || {});
    } catch { }
  }, [statusUrl]);

  const fetchWallets = useCallback(async () => {
    try {
      const r = await fetch(walletsUrl, { headers });
      const d = await r.json();
      setWallets(d.wallets || []);
    } catch { }
  }, [walletsUrl]);

  useEffect(() => {
    fetchStatus();
    fetchWallets();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchWallets]);

  const startBot = async () => {
    const url = isVolume ? `${API}/api/admin/bot/start` : `${API}/api/admin/bot/${botType}/start`;
    const r = await fetch(url, { method: 'POST', headers });
    const d = await r.json();
    if (d.success) { toast.success('Bot uruchomiony'); fetchStatus(); }
    else toast.error(d.message || 'Nie można uruchomić bota');
  };

  const stopBot = async () => {
    const url = isVolume ? `${API}/api/admin/bot/stop` : `${API}/api/admin/bot/${botType}/stop`;
    const r = await fetch(url, { method: 'POST', headers });
    const d = await r.json();
    if (d.success) { toast.success('Bot zatrzymany'); fetchStatus(); }
  };

  const saveConfig = async () => {
    const url = isVolume ? `${API}/api/admin/bot/config` : `${API}/api/admin/bot/${botType}/config`;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(config) });
    const d = await r.json();
    if (d.success) toast.success('Konfiguracja zapisana');
  };

  const generateWallets = async () => {
    setLoading(true);
    const url = isVolume ? `${API}/api/admin/wallets/generate` : `${API}/api/admin/bot/${botType}/wallets/generate`;
    const prefix = botInfo?.name?.split(' ')[0] || 'Bot';
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ count: genCount, prefix }) });
    const d = await r.json();
    toast.success(`Wygenerowano ${d.created || 0} portfeli`);
    fetchWallets();
    setLoading(false);
  };

  const setMainWallet = async (pk) => {
    const url = isVolume ? `${API}/api/admin/wallets/${pk}/main` : `${API}/api/admin/bot/${botType}/wallets/${pk}/main`;
    await fetch(url, { method: 'POST', headers });
    fetchWallets();
  };

  const removeWallet = async (pk) => {
    const url = isVolume ? `${API}/api/admin/wallets/${pk}` : `${API}/api/admin/bot/${botType}/wallets/${pk}`;
    await fetch(url, { method: 'DELETE', headers });
    fetchWallets();
  };

  const distributeSol = async () => {
    const url = isVolume ? `${API}/api/admin/wallets/distribute` : `${API}/api/admin/bot/${botType}/wallets/distribute`;
    await fetch(url, { method: 'POST', headers, body: JSON.stringify({ sol_per_wallet: distAmount }) });
    toast.success('Dystrybucja rozpoczęta');
  };

  const collectSol = async () => {
    const url = isVolume ? `${API}/api/admin/wallets/collect` : `${API}/api/admin/bot/${botType}/wallets/collect`;
    await fetch(url, { method: 'POST', headers });
    toast.success('Zbieranie SOL rozpoczęte');
  };

  const stats = status?.stats || {};
  const txs = status?.recent_transactions || [];
  const running = status?.running || false;
  const totalSol = wallets.reduce((s, w) => s + (w.balance_sol || 0), 0);
  const totalToken = wallets.reduce((s, w) => s + (w.balance_token || w.balance_ftrx || 0), 0);
  const configFields = CONFIG_FIELDS[botType] || [];

  const txColors = { BUY: '#00FF88', SELL: '#FF4444', TRANSFER: '#4488FF', ERROR: '#666', SNIPE_BUY: '#FFD700', TAKE_PROFIT: '#00FF88', STOP_LOSS: '#FF4444', COPY_BUY: '#FF8844', COPY_SELL: '#FF4444', WHALE_BUY: '#FFD700', WHALE_SELL: '#FF8844', ARB_SUCCESS: '#00FF88', ARB_FAIL: '#FF4444', OPPORTUNITY: '#AA44FF', NEW_POOL: '#FFD700', REFUND: '#888' };

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10 p-2"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${botInfo?.color}22` }}>
            {botInfo && <botInfo.icon className="w-5 h-5" style={{ color: botInfo.color }} />}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: botInfo?.color }}>{botInfo?.name}</h1>
            <p className="text-xs text-gray-500">{botInfo?.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { fetchStatus(); fetchWallets(); }} className="text-white hover:bg-white/10"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">STATUS</p>
            <p className={`font-bold ${running ? 'text-green-400' : 'text-red-400'}`}>{running ? 'Uruchomiony' : 'Zatrzymany'}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">TRADES</p>
            <p className="font-bold text-white">{stats.total_trades || stats.total_snipes || stats.total_arbs || stats.total_copies || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">PROFIT</p>
            <p className={`font-bold ${(stats.profit_sol || stats.total_profit_sol || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(stats.profit_sol || stats.total_profit_sol || 0).toFixed(4)} SOL
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">ERRORS</p>
            <p className="font-bold text-gray-400">{stats.errors || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Start/Stop + Activity */}
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Kontrola Bota</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4">
              <Button onClick={startBot} disabled={running} className="flex-1 bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-2" /> Start</Button>
              <Button onClick={stopBot} disabled={!running} className="flex-1 bg-red-600 hover:bg-red-700"><Square className="w-4 h-4 mr-2" /> Stop</Button>
            </div>
            {/* Activity Chart */}
            {txs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Aktywność</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={txs.slice(-30)}>
                    <XAxis dataKey="time" tick={false} />
                    <YAxis tick={false} />
                    <Tooltip content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return <div className="bg-black border border-gray-700 p-2 text-xs rounded"><p>{d.type} | {d.wallet}</p><p>{d.amount} SOL</p></div>;
                    }} />
                    <Bar dataKey="amount">{txs.slice(-30).map((t, i) => <Cell key={i} fill={txColors[t.type] || '#666'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
          <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Konfiguracja</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {configFields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={config[f.key] || ''}
                    onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm"
                  >
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    type={f.type}
                    step={f.step}
                    value={config[f.key] ?? ''}
                    onChange={e => setConfig({ ...config, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                    className="bg-black border-gray-700 text-white"
                  />
                )}
              </div>
            ))}
            <Button onClick={saveConfig} className="w-full mt-2" style={{ background: botInfo?.color, color: '#000' }}>Zapisz konfigurację</Button>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Section */}
      <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)] mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> Portfele ({wallets.length}) | {totalSol.toFixed(4)} SOL | {totalToken.toFixed(2)} Token</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Generate + Distribute + Collect */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="flex gap-2">
              <Input type="number" value={genCount} onChange={e => setGenCount(parseInt(e.target.value) || 1)} className="bg-black border-gray-700 text-white w-20" />
              <Button onClick={generateWallets} disabled={loading} className="flex-1 bg-gray-800 hover:bg-gray-700"><Plus className="w-4 h-4 mr-1" /> Generuj</Button>
            </div>
            <div className="flex gap-2">
              <Input type="number" step={0.001} value={distAmount} onChange={e => setDistAmount(parseFloat(e.target.value) || 0)} className="bg-black border-gray-700 text-white w-24" />
              <Button onClick={distributeSol} className="flex-1 bg-gray-800 hover:bg-gray-700">Rozdziel SOL</Button>
            </div>
            <Button onClick={collectSol} className="bg-purple-700 hover:bg-purple-600">Zbierz cały SOL</Button>
          </div>

          {/* Wallet List */}
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {wallets.map(w => (
              <div key={w.public_key} className={`flex items-center justify-between p-2 rounded ${w.is_main ? 'border border-yellow-600/30 bg-yellow-900/10' : 'hover:bg-white/5'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-300">{w.label}</span>
                  {w.is_main && <span className="text-[10px] bg-yellow-600 text-black px-1.5 rounded font-bold">GLOWNY</span>}
                  <span className="text-xs text-gray-600 truncate">{w.public_key?.substring(0, 20)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-green-400">{(w.balance_sol || 0).toFixed(4)} SOL</span>
                  {(w.balance_token || w.balance_ftrx || 0) > 0 && (
                    <span className="text-sm text-orange-400">{(w.balance_token || w.balance_ftrx || 0).toFixed(2)}</span>
                  )}
                  <button onClick={() => setMainWallet(w.public_key)} className="text-gray-600 hover:text-yellow-400"><Star className="w-4 h-4" /></button>
                  <button onClick={() => removeWallet(w.public_key)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {wallets.length === 0 && <p className="text-gray-600 text-center py-4">Brak portfeli. Wygeneruj nowe.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Log */}
      <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)]">
        <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Log Transakcji ({txs.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {txs.slice(-20).reverse().map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-900">
                <div className="flex items-center gap-2">
                  <span className="w-20 font-mono font-bold" style={{ color: txColors[tx.type] || '#666' }}>{tx.type}</span>
                  <span className="text-gray-500">{tx.wallet}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white">{tx.amount} SOL</span>
                  <span className="text-gray-600 truncate max-w-[150px]">{tx.detail || tx.tx}</span>
                </div>
              </div>
            ))}
            {txs.length === 0 && <p className="text-gray-600 text-center py-4">Brak transakcji. Uruchom bota.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [selectedBot, setSelectedBot] = useState(null);
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

  useEffect(() => {
    const s = sessionStorage.getItem('adm');
    if (s) { setPw(s); setAuthed(true); }
  }, []);

  if (!authed) {
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
              <Input data-testid="admin-password-input" type="password" placeholder="Haslo admina" value={pw} onChange={e => setPw(e.target.value)} className="bg-black border-gray-700 text-white" />
              <Button data-testid="admin-login-btn" type="submit" className="w-full bg-[#00FFD1] text-black font-bold hover:bg-[#00DDC0]" disabled={loading}>{loading ? 'Logowanie...' : 'Zaloguj'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedBot) {
    return <BotDashboard botType={selectedBot} pw={pw} onBack={() => setSelectedBot(null)} />;
  }

  // Bot Selection Screen
  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></a>
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-[#00FFD1] bg-[#00FFD1]/10 px-2 py-0.5 rounded text-sm mr-2">FTRX</span>
              Bot Admin Panel
            </h1>
            <p className="text-gray-500 text-sm mt-1">Wybierz bota do zarządzania</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { sessionStorage.removeItem('adm'); setAuthed(false); }} className="text-gray-500 hover:text-white">Wyloguj</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BOT_TYPES.map(bot => (
          <Card
            key={bot.id}
            data-testid={`bot-select-${bot.id}`}
            className="bg-[#0a0a0a] border-[rgba(255,255,255,0.1)] hover:border-opacity-40 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
            style={{ borderColor: `${bot.color}33` }}
            onClick={() => setSelectedBot(bot.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${bot.color}15` }}>
                  <bot.icon className="w-6 h-6" style={{ color: bot.color }} />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-bold text-lg mb-1" style={{ color: bot.color }}>{bot.name}</h3>
              <p className="text-gray-500 text-sm">{bot.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
