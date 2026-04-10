import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Play, Square, RefreshCw, Plus, Trash2, Settings, Activity, 
  Wallet, ArrowLeft, Lock, Eye, EyeOff, AlertTriangle, 
  TrendingUp, Zap, Clock, XCircle
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const AdminPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (resp.ok) {
        sessionStorage.setItem('admin_pw', password);
        setAuthenticated(true);
      } else {
        toast.error('Nieprawidlowe haslo');
      }
    } catch {
      toast.error('Blad polaczenia z serwerem');
    }
    setLoginLoading(false);
  };

  if (!authenticated) {
    const saved = sessionStorage.getItem('admin_pw');
    if (saved) {
      setAuthenticated(true);
      setPassword(saved);
      return null;
    }
    return <LoginScreen password={password} setPassword={setPassword} onLogin={handleLogin} loading={loginLoading} />;
  }

  return <Dashboard adminPassword={password} onLogout={() => { sessionStorage.removeItem('admin_pw'); setAuthenticated(false); }} />;
};

const LoginScreen = ({ password, setPassword, onLogin, loading }) => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <Card data-testid="admin-login-card" className="bg-[#0a0a0a] border-[rgba(255,255,255,0.15)] w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4 rounded">
          <Lock className="w-8 h-8 text-[#00FFD1]" />
        </div>
        <CardTitle className="text-white text-2xl">Volume Bot Admin</CardTitle>
        <p className="text-[#666] text-sm mt-2">FTRX Volume Bot - Panel Administracyjny</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onLogin} className="space-y-4">
          <Input
            data-testid="admin-password-input"
            type="password"
            placeholder="Haslo admina"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black border-[rgba(255,255,255,0.2)] text-white h-12"
          />
          <Button data-testid="admin-login-btn" type="submit" disabled={loading || !password} className="btn-primary w-full h-12">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Zaloguj'}
          </Button>
        </form>
      </CardContent>
    </Card>
    <Toaster />
  </div>
);

const Dashboard = ({ adminPassword, onLogout }) => {
  const [status, setStatus] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-password': adminPassword,
  };

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/bot/status`, { headers: { 'x-admin-password': adminPassword } });
      if (resp.ok) setStatus(await resp.json());
    } catch { /* ignore */ }
  }, [adminPassword]);

  const fetchWallets = useCallback(async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/wallets`, { headers: { 'x-admin-password': adminPassword } });
      if (resp.ok) {
        const data = await resp.json();
        setWallets(data.wallets || []);
      }
    } catch { /* ignore */ }
  }, [adminPassword]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchWallets()]);
    setLoading(false);
  }, [fetchStatus, fetchWallets]);

  useEffect(() => {
    refresh();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [refresh, fetchStatus]);

  const startBot = async () => {
    setActionLoading('start');
    try {
      const resp = await fetch(`${API_URL}/api/admin/bot/start`, { method: 'POST', headers });
      const data = await resp.json();
      toast.success(data.message);
      await fetchStatus();
    } catch { toast.error('Blad uruchamiania bota'); }
    setActionLoading('');
  };

  const stopBot = async () => {
    setActionLoading('stop');
    try {
      const resp = await fetch(`${API_URL}/api/admin/bot/stop`, { method: 'POST', headers });
      const data = await resp.json();
      toast.success(data.message);
      await fetchStatus();
    } catch { toast.error('Blad zatrzymywania bota'); }
    setActionLoading('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.1)] px-4 md:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[#666] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="w-8 h-8 bg-[#00FFD1] flex items-center justify-center font-bold text-black text-[10px]">
              FTRX
            </div>
            <span className="text-lg font-bold">Volume Bot</span>
            {status?.running && (
              <span data-testid="bot-running-badge" className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded animate-pulse">
                AKTYWNY
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refresh} className="p-2 hover:bg-white/5 rounded transition-colors">
              <RefreshCw className={`w-4 h-4 text-[#666] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button onClick={onLogout} variant="ghost" className="text-[#666] hover:text-white text-sm">
              Wyloguj
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Activity className="w-5 h-5" />} label="Status" value={status?.running ? 'Aktywny' : 'Zatrzymany'} color={status?.running ? 'text-green-400' : 'text-red-400'} testId="stat-status" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Transakcje" value={status?.stats?.total_trades || 0} testId="stat-trades" />
          <StatCard icon={<Zap className="w-5 h-5" />} label="Wolumen (SOL)" value={(status?.stats?.total_volume_sol || 0).toFixed(4)} testId="stat-volume" />
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Bledy" value={status?.stats?.errors || 0} color="text-red-400" testId="stat-errors" />
        </div>

        {/* Controls + Config */}
        <div className="grid md:grid-cols-2 gap-4">
          <BotControls running={status?.running} onStart={startBot} onStop={stopBot} actionLoading={actionLoading} stats={status?.stats} />
          <BotConfig config={status?.config} headers={headers} onUpdate={fetchStatus} />
        </div>

        {/* Wallets */}
        <WalletManager wallets={wallets} headers={headers} onRefresh={fetchWallets} />

        {/* Transaction Log */}
        <TransactionLog transactions={status?.recent_transactions || []} />
      </div>
      <Toaster />
    </div>
  );
};

const StatCard = ({ icon, label, value, color = 'text-[#00FFD1]', testId }) => (
  <div data-testid={testId} className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.08)] p-4 rounded">
    <div className="flex items-center gap-2 text-[#444] mb-2">{icon}<span className="text-xs uppercase">{label}</span></div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const BotControls = ({ running, onStart, onStop, actionLoading, stats }) => {
  const uptime = stats?.started_at ? Math.floor((Date.now() / 1000 - stats.started_at) / 60) : 0;
  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-[#00FFD1]" />Kontrola Bota</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button data-testid="bot-start-btn" onClick={onStart} disabled={running || actionLoading === 'start'} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12">
            {actionLoading === 'start' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span className="ml-2">Start</span>
          </Button>
          <Button data-testid="bot-stop-btn" onClick={onStop} disabled={!running || actionLoading === 'stop'} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12">
            {actionLoading === 'stop' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            <span className="ml-2">Stop</span>
          </Button>
        </div>
        {running && (
          <div className="bg-green-500/5 border border-green-500/20 p-3 rounded text-sm space-y-1">
            <div className="flex justify-between"><span className="text-[#666]">Czas pracy:</span><span className="text-green-400">{uptime} min</span></div>
            <div className="flex justify-between"><span className="text-[#666]">Cykle:</span><span className="text-white">{stats?.cycles || 0}</span></div>
            <div className="flex justify-between"><span className="text-[#666]">Ostatnia transakcja:</span><span className="text-white">{stats?.last_trade_time ? new Date(stats.last_trade_time * 1000).toLocaleTimeString() : '-'}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BotConfig = ({ config, headers, onUpdate }) => {
  const [form, setForm] = useState({});
  useEffect(() => { if (config) setForm(config); }, [config]);

  const saveConfig = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/bot/config`, {
        method: 'POST', headers, body: JSON.stringify(form),
      });
      if (resp.ok) { toast.success('Konfiguracja zapisana'); onUpdate(); }
    } catch { toast.error('Blad zapisu'); }
  };

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-[#00FFD1]" />Konfiguracja</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#666] mb-1 block">Min SOL</label>
            <Input type="number" step="0.001" value={form.min_sol || ''} onChange={(e) => setForm({...form, min_sol: parseFloat(e.target.value)})} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1 block">Max SOL</label>
            <Input type="number" step="0.001" value={form.max_sol || ''} onChange={(e) => setForm({...form, max_sol: parseFloat(e.target.value)})} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1 block">Min delay (s)</label>
            <Input type="number" value={form.min_delay || ''} onChange={(e) => setForm({...form, min_delay: parseInt(e.target.value)})} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
          </div>
          <div>
            <label className="text-xs text-[#666] mb-1 block">Max delay (s)</label>
            <Input type="number" value={form.max_delay || ''} onChange={(e) => setForm({...form, max_delay: parseInt(e.target.value)})} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[#666] mb-1 block">Slippage (bps) - 100 = 1%</label>
          <Input type="number" value={form.slippage_bps || ''} onChange={(e) => setForm({...form, slippage_bps: parseInt(e.target.value)})} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
        </div>
        <Button data-testid="save-config-btn" onClick={saveConfig} className="btn-primary w-full h-10">Zapisz konfiguracje</Button>
      </CardContent>
    </Card>
  );
};

const WalletManager = ({ wallets, headers, onRefresh }) => {
  const [label, setLabel] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [adding, setAdding] = useState(false);

  const addWallet = async (e) => {
    e.preventDefault();
    if (!label || !privateKey) return;
    setAdding(true);
    try {
      const resp = await fetch(`${API_URL}/api/admin/wallets`, {
        method: 'POST', headers, body: JSON.stringify({ label, private_key: privateKey }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Portfel dodany: ${data.public_key.slice(0, 8)}...`);
        setLabel(''); setPrivateKey('');
        onRefresh();
      } else {
        toast.error(data.error || 'Blad dodawania portfela');
      }
    } catch { toast.error('Blad polaczenia'); }
    setAdding(false);
  };

  const removeWallet = async (pubkey) => {
    try {
      const resp = await fetch(`${API_URL}/api/admin/wallets/${pubkey}`, { method: 'DELETE', headers });
      const data = await resp.json();
      if (data.success) { toast.success('Portfel usuniety'); onRefresh(); }
    } catch { toast.error('Blad usuwania'); }
  };

  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-[#00FFD1]" />Portfele ({wallets.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Add wallet form */}
        <form onSubmit={addWallet} className="space-y-3 bg-black/50 p-4 rounded border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-2 text-sm text-[#666] mb-1"><Plus className="w-4 h-4" /> Dodaj portfel</div>
          <Input placeholder="Nazwa portfela (np. Wallet 1)" value={label} onChange={(e) => setLabel(e.target.value)} className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10" />
          <div className="relative">
            <Input
              data-testid="wallet-private-key-input"
              type={showKey ? 'text' : 'password'}
              placeholder="Klucz prywatny (base58 lub JSON array)"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="bg-black border-[rgba(255,255,255,0.15)] text-white h-10 pr-10"
            />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666]">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-start gap-2 text-xs text-yellow-500/80">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Klucze prywatne sa przechowywane w bazie danych. Uzyj portfeli przeznaczonych tylko do bota.</span>
          </div>
          <Button data-testid="add-wallet-btn" type="submit" disabled={adding || !label || !privateKey} className="btn-primary w-full h-10">
            {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Dodaj portfel'}
          </Button>
        </form>

        {/* Wallet list */}
        {wallets.length === 0 ? (
          <p className="text-center text-[#444] text-sm py-4">Brak dodanych portfeli. Dodaj portfel aby uruchomic bota.</p>
        ) : (
          <div className="space-y-2">
            {wallets.map((w) => (
              <div key={w.public_key} className="flex items-center justify-between bg-black/30 border border-[rgba(255,255,255,0.05)] p-3 rounded">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{w.label}</p>
                  <p className="text-xs text-[#666] font-mono truncate">{w.public_key}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-sm font-semibold text-[#00FFD1]">{(w.balance_sol || 0).toFixed(4)} SOL</span>
                  <button onClick={() => removeWallet(w.public_key)} className="text-red-400/60 hover:text-red-400 transition-colors">
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
};

const TransactionLog = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
        <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-[#00FFD1]" />Log Transakcji</CardTitle></CardHeader>
        <CardContent><p className="text-center text-[#444] text-sm py-4">Brak transakcji. Uruchom bota i dodaj portfel.</p></CardContent>
      </Card>
    );
  }

  const reversed = [...transactions].reverse();
  return (
    <Card className="bg-[#0a0a0a] border-[rgba(255,255,255,0.08)]">
      <CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-[#00FFD1]" />Log Transakcji ({transactions.length})</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#666] text-xs border-b border-[rgba(255,255,255,0.05)]">
                <th className="text-left py-2 px-2">Typ</th>
                <th className="text-left py-2 px-2">SOL</th>
                <th className="text-left py-2 px-2">Portfel</th>
                <th className="text-left py-2 px-2">Sygnatura / Blad</th>
                <th className="text-left py-2 px-2">Czas</th>
              </tr>
            </thead>
            <tbody>
              {reversed.slice(0, 50).map((tx, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-white/[0.02]">
                  <td className="py-2 px-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      tx.type === 'BUY' ? 'bg-green-500/10 text-green-400' :
                      tx.type === 'SELL' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{tx.type}</span>
                  </td>
                  <td className="py-2 px-2 text-white font-mono">{tx.sol_amount}</td>
                  <td className="py-2 px-2 text-[#888]">{tx.wallet}</td>
                  <td className="py-2 px-2 font-mono text-xs max-w-[200px] truncate">
                    {tx.error ? (
                      <span className="text-red-400">{tx.error}</span>
                    ) : tx.signature ? (
                      <a href={`https://solscan.io/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer" className="text-[#00FFD1] hover:underline">
                        {tx.signature.slice(0, 16)}...
                      </a>
                    ) : '-'}
                  </td>
                  <td className="py-2 px-2 text-[#666]">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPage;
