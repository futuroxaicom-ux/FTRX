import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { TOKEN_CONFIG } from '../config/links';

export const LivePriceChart = () => {
  const { t } = useTranslation();
  const [solPrice, setSolPrice] = useState(null);
  const [solChange24h, setSolChange24h] = useState(0);
  const [ftrxPrice, setFtrxPrice] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SOL'); // SOL or FTRX

  // Fetch Solana price from CoinGecko
  const fetchSolanaPrice = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
      );
      const data = await response.json();
      
      if (data.solana) {
        setSolPrice(data.solana.usd);
        setSolChange24h(data.solana.usd_24h_change);
      }
    } catch (error) {
      console.error('Failed to fetch Solana price:', error);
    }
  };

  // Fetch 7-day price history for chart
  const fetchPriceHistory = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=7&interval=daily'
      );
      const data = await response.json();
      
      if (data.prices) {
        const formattedData = data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          price: price.toFixed(2)
        }));
        setChartData(formattedData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch price history:', error);
      setLoading(false);
    }
  };

  // Fetch FTRX price (placeholder - implement after token launch)
  const fetchFTRXPrice = async () => {
    // TODO: Implement after token is deployed
    // For now, simulate with mock data or fetch from your API
    // Example: Use Jupiter API or your own backend
    
    // Check if token address is configured
    if (!TOKEN_CONFIG.address.includes('PLACEHOLDER')) {
      // Fetch real price from Jupiter or Raydium
      // setFtrxPrice(fetchedPrice);
    } else {
      // Mock data for demonstration
      setFtrxPrice(0.0042); // Example price
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchSolanaPrice();
    fetchPriceHistory();
    fetchFTRXPrice();

    // Update every minute
    const interval = setInterval(() => {
      fetchSolanaPrice();
      if (activeTab === 'FTRX') {
        fetchFTRXPrice();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [activeTab]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121212] border border-[rgba(0,255,209,0.3)] p-3 rounded">
          <p className="text-white text-sm font-semibold">${payload[0].value}</p>
          <p className="text-[#4D4D4D] text-xs">{payload[0].payload.time}</p>
        </div>
      );
    }
    return null;
  };

  const isPositiveChange = solChange24h >= 0;
  const isFtrxAvailable = !TOKEN_CONFIG.address.includes('PLACEHOLDER');

  return (
    <Card className="bg-[#121212] border-[rgba(0,255,209,0.3)] overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#00FFD1]" />
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
              disabled={!isFtrxAvailable}
            >
              FTRX {!isFtrxAvailable && '🔒'}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {activeTab === 'SOL' && (
          <>
            {/* SOL Price Display */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-white">
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

            {/* Chart */}
            <div className="w-full h-[250px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-[#00FFD1]">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FFD1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00FFD1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#4D4D4D"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#4D4D4D"
                      style={{ fontSize: '12px' }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#00FFD1" 
                      strokeWidth={2}
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Additional Info */}
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
          <div className="text-center py-12">
            {isFtrxAvailable ? (
              <>
                {/* FTRX Price (when available) */}
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-white">
                    ${ftrxPrice?.toFixed(4)}
                  </div>
                  <p className="text-sm text-[#4D4D4D]">FuturoX AI (FTRX) / USD</p>
                  <div className="bg-[rgba(0,255,209,0.1)] border border-[rgba(0,255,209,0.3)] p-4 rounded">
                    <p className="text-[#00FFD1] text-sm">
                      🚀 FTRX trading live on Raydium!
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Placeholder when token not deployed */}
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">FTRX Price Coming Soon</h3>
                  <p className="text-[rgba(255,255,255,0.7)] max-w-md mx-auto">
                    FTRX token price chart will be available after token launch on May 10, 2026
                  </p>
                  <div className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-4 rounded mt-4">
                    <p className="text-sm text-[#4D4D4D]">
                      Pre-order rate: 1 SOL = 10,000 FTRX
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-[#4D4D4D] text-center pt-2">
          Updated every 60 seconds • Powered by CoinGecko
        </div>
      </CardContent>
    </Card>
  );
};
