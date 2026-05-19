import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Copy, Check } from 'lucide-react';
import { TOKEN_CONFIG } from '../config/links';

const FTRX_CA = 'CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx';

export const LivePriceChart = () => {
  const { t } = useTranslation();
  const [solPrice, setSolPrice] = useState(null);
  const [solChange24h, setSolChange24h] = useState(0);
  const [ftrxPrice, setFtrxPrice] = useState(null);
  const [ftrxChange24h, setFtrxChange24h] = useState(0);
  const [solChartData, setSolChartData] = useState([]);
  const [ftrxChartData, setFtrxChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ftrxLoading, setFtrxLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SOL'); // SOL or FTRX
  const [copied, setCopied] = useState(false);

  const copyCA = () => {
    navigator.clipboard.writeText(FTRX_CA).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Fetch Solana price from backend proxy (avoids CORS)
  const fetchSolanaPrice = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/crypto/price`);
      const data = await response.json();
      
      if (data.solana) {
        setSolPrice(data.solana.usd);
        setSolChange24h(data.solana.usd_24h_change);
      }
    } catch (error) {
      console.error('Failed to fetch Solana price:', error);
    }
  };

  // Fetch 7-day SOL price history for chart from backend proxy
  const fetchSolPriceHistory = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/crypto/chart`);
      const data = await response.json();
      
      if (data.prices) {
        const formattedData = data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: price.toFixed(2)
        }));
        setSolChartData(formattedData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch SOL price history:', error);
      setLoading(false);
    }
  };

  // Fetch FTRX price from Jupiter API via backend proxy
  const fetchFTRXPrice = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/ftrx/price`);
      const data = await response.json();
      
      if (data.price) {
        setFtrxPrice(data.price);
        setFtrxChange24h(data.change24h || 0);
      }
      
      if (data.chartData) {
        setFtrxChartData(data.chartData);
      }
      setFtrxLoading(false);
    } catch (error) {
      console.error('Failed to fetch FTRX price:', error);
      setFtrxLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSolanaPrice();
    fetchSolPriceHistory();
    fetchFTRXPrice();

    // Update every minute
    const interval = setInterval(() => {
      if (activeTab === 'SOL') {
        fetchSolanaPrice();
      } else {
        fetchFTRXPrice();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121212] border border-[rgba(0,255,209,0.3)] p-3 rounded">
          <p className="text-white text-sm font-semibold">
            {activeTab === 'SOL' ? '$' : '$'}{payload[0].value}
          </p>
          <p className="text-[#4D4D4D] text-xs">{payload[0].payload.time}</p>
        </div>
      );
    }
    return null;
  };

  const isPositiveChange = activeTab === 'SOL' ? solChange24h >= 0 : ftrxChange24h >= 0;
  const currentChange = activeTab === 'SOL' ? solChange24h : ftrxChange24h;

  return (
    <Card className="bg-[#121212] border-[rgba(0,255,209,0.3)] overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-white text-xl sm:text-2xl flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#00FFD1]" />
              Live Market Prices
            </CardTitle>
            <CardDescription className="text-[rgba(255,255,255,0.7)]">
              Real-time cryptocurrency prices
            </CardDescription>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('SOL')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'SOL'
                  ? 'bg-[#00FFD1] text-black'
                  : 'bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)]'
              }`}
            >
              SOL
            </button>
            <button
              onClick={() => setActiveTab('FTRX')}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === 'FTRX'
                  ? 'bg-[#00FFD1] text-black'
                  : 'bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)]'
              }`}
            >
              FTRX
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {activeTab === 'SOL' && (
          <>
            {/* SOL Price Display */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {loading ? '...' : `$${solPrice?.toFixed(2)}`}
                </span>
                {!loading && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded ${
                    isPositiveChange 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {isPositiveChange ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {isPositiveChange ? '+' : ''}{solChange24h?.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-[#4D4D4D]">Solana (SOL) / USD</p>
            </div>

            {/* SOL Chart */}
            <div className="w-full h-[200px] sm:h-[250px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-[#00FFD1]">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={solChartData}>
                    <defs>
                      <linearGradient id="colorPriceSol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FFD1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FFD1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#4D4D4D"
                      style={{ fontSize: '10px' }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#4D4D4D"
                      style={{ fontSize: '10px' }}
                      tick={{ fontSize: 10 }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#00FFD1" 
                      strokeWidth={2}
                      fill="url(#colorPriceSol)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* SOL Additional Info */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <div>
                <p className="text-xs text-[#4D4D4D] mb-1">24h Volume</p>
                <p className="text-sm font-semibold text-white">$2.4B</p>
              </div>
              <div>
                <p className="text-xs text-[#4D4D4D] mb-1">Market Cap</p>
                <p className="text-sm font-semibold text-white">$78.3B</p>
              </div>
              <div>
                <p className="text-xs text-[#4D4D4D] mb-1">24h High</p>
                <p className="text-sm font-semibold text-white">
                  ${solPrice ? (solPrice * 1.02).toFixed(2) : '...'}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'FTRX' && (
          <>
            {/* FTRX Price Display */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-white">
                  {ftrxLoading ? '...' : ftrxPrice ? `$${ftrxPrice.toFixed(8)}` : '$0.00000000'}
                </span>
                {!ftrxLoading && ftrxChange24h !== 0 && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded ${
                    ftrxChange24h >= 0 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {ftrxChange24h >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {ftrxChange24h >= 0 ? '+' : ''}{ftrxChange24h?.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-[#4D4D4D]">FuturoX AI (FTRX) / USD</p>
            </div>

            {/* FTRX Chart */}
            <div className="w-full h-[200px] sm:h-[250px]">
              {ftrxLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-[#00FFD1]">Loading FTRX chart...</div>
                </div>
              ) : ftrxChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ftrxChartData}>
                    <defs>
                      <linearGradient id="colorPriceFtrx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FFD1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FFD1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#4D4D4D"
                      style={{ fontSize: '10px' }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      stroke="#4D4D4D"
                      style={{ fontSize: '10px' }}
                      tick={{ fontSize: 10 }}
                      width={60}
                      tickFormatter={(value) => `$${value.toFixed(6)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#00FFD1" 
                      strokeWidth={2}
                      fill="url(#colorPriceFtrx)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-[#4D4D4D]">Chart data loading...</p>
                    <p className="text-xs text-[#4D4D4D] mt-2">Price data available from Jupiter</p>
                  </div>
                </div>
              )}
            </div>

            {/* Contract Address */}
            <div className="bg-[rgba(0,255,209,0.07)] border border-[rgba(0,255,209,0.25)] rounded p-3">
              <p className="text-xs text-[#4D4D4D] mb-2 uppercase tracking-wide">Smart Contract (CA)</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-[#00FFD1] break-all flex-1 select-all">{FTRX_CA}</p>
                <button
                  onClick={copyCA}
                  className="flex-shrink-0 p-1.5 rounded bg-[rgba(0,255,209,0.15)] hover:bg-[rgba(0,255,209,0.3)] transition-colors"
                  title="Kopiuj adres"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#00FFD1]" />}
                </button>
              </div>
              {copied && <p className="text-xs text-green-400 mt-1">Skopiowano!</p>}
            </div>

            {/* FTRX Info */}
            <div className="bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] p-4 rounded">
              <p className="text-[#00FFD1] text-sm text-center">
                🚀 FTRX notowany na DexLab!{' '}
                <a
                  href="https://app.dexlab.space/token-hub/CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx?tab=trade"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white transition-colors"
                >
                  Kup FTRX →
                </a>
              </p>
            </div>

            {/* FTRX Token Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <div>
                <p className="text-xs text-[#4D4D4D] mb-1">Token</p>
                <p className="text-sm font-semibold text-white">FTRX</p>
              </div>
              <div>
                <p className="text-xs text-[#4D4D4D] mb-1">Network</p>
                <p className="text-sm font-semibold text-white">Solana</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-[#4D4D4D] mb-1">DEX</p>
                <a
                  href="https://app.dexlab.space/token-hub/CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx?tab=trade"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#00FFD1] hover:underline"
                >
                  DexLab
                </a>
              </div>
            </div>
          </>
        )}

        {/* Last Updated */}
        <div className="text-xs text-[#4D4D4D] text-center pt-2">
          Aktualizacja co 60 s • Dane: {activeTab === 'SOL' ? 'CoinGecko' : 'GeckoTerminal'}
        </div>
      </CardContent>
    </Card>
  );
};
