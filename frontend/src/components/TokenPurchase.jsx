import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowDown, Coins, Loader2, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const TokenPurchase = () => {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const [solAmount, setSolAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [ftrxPrice, setFtrxPrice] = useState(null);
  const [solPrice, setSolPrice] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    try {
      setPriceLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      
      const [ftrxResponse, solResponse] = await Promise.all([
        fetch(`${backendUrl}/api/ftrx/price`),
        fetch(`${backendUrl}/api/crypto/price`)
      ]);
      
      const ftrxData = await ftrxResponse.json();
      if (ftrxData.price) {
        setFtrxPrice(ftrxData.price);
      }
      
      const solData = await solResponse.json();
      if (solData.solana) {
        setSolPrice(solData.solana.usd);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setBalanceLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/solana/balance/${publicKey.toString()}`);
      const data = await response.json();
      if (data.sol !== undefined) {
        setUserBalance(data.sol);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
    }
  }, [publicKey, fetchBalance]);

  const calculateTokens = (sol) => {
    const solAmountNum = parseFloat(sol) || 0;
    if (solPrice && ftrxPrice && ftrxPrice > 0) {
      const usdValue = solAmountNum * solPrice;
      const ftrxAmount = usdValue / ftrxPrice;
      setTokenAmount(ftrxAmount.toFixed(2));
    } else {
      setTokenAmount((solAmountNum * 10000).toFixed(2));
    }
  };

  const handleSetMax = () => {
    if (userBalance && userBalance > 0.001) {
      const maxAmount = (userBalance - 0.001).toFixed(4);
      setSolAmount(maxAmount);
      calculateTokens(maxAmount);
    }
  };

  const handlePurchase = async () => {
    if (!publicKey) {
      toast.error(t('purchase.connectFirst'));
      return;
    }

    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast.error(t('purchase.swap.invalidAmount'));
      return;
    }

    const amount = parseFloat(solAmount);
    if (amount < 0.001) {
      toast.error(t('purchase.swap.minPurchase'));
      return;
    }

    try {
      setLoading(true);
      
      if (userBalance !== null && userBalance < amount) {
        toast.error(t('purchase.swap.insufficientBalance', { balance: userBalance.toFixed(4) }));
        setLoading(false);
        return;
      }

      const raydiumUrl = `https://raydium.io/swap/?inputMint=sol&outputMint=9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray&inputAmount=${solAmount}`;
      window.open(raydiumUrl, '_blank', 'noopener,noreferrer');
      
      toast.success(t('purchase.swap.openingRaydium'), {
        description: t('purchase.swap.swapDesc', { sol: solAmount, ftrx: parseFloat(tokenAmount).toLocaleString() }),
      });
      
      setLoading(false);

    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error(t('purchase.swap.transactionFailed'));
      setLoading(false);
    }
  };

  const currentRate = solPrice && ftrxPrice && ftrxPrice > 0 
    ? (solPrice / ftrxPrice).toFixed(0) 
    : '...';

  if (!publicKey) {
    return (
      <Card data-testid="token-purchase-card-disconnected" className="bg-[#121212] border-[rgba(255,255,255,0.25)]">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center">
              <Coins className="w-6 h-6 text-[#00FFD1]" />
            </div>
            <div>
              <CardTitle className="text-white">{t('purchase.title')}</CardTitle>
              <CardDescription className="text-[rgba(255,255,255,0.85)]">
                {t('purchase.connectFirst')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-4 text-center">
            <p className="text-sm text-[rgba(255,255,255,0.7)]">
              {t('purchase.swap.connectInfo')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="token-purchase-card-connected" className="bg-[#121212] border-[rgba(255,255,255,0.25)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FFD1] opacity-5 blur-[60px]"></div>
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#00FFD1]" />
            </div>
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                {t('purchase.title')}
                <span data-testid="live-badge" className="text-xs bg-[#00FFD1] text-black px-2 py-0.5 rounded">{t('purchase.swap.live')}</span>
              </CardTitle>
              <CardDescription data-testid="current-rate-display" className="text-[rgba(255,255,255,0.7)]">
                {t('purchase.swap.currentRate', { rate: currentRate })}
              </CardDescription>
            </div>
          </div>
          <button 
            data-testid="refresh-prices-btn"
            onClick={fetchPrices}
            className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
            title="Refresh prices"
          >
            <RefreshCw className={`w-4 h-4 text-[#00FFD1] ${priceLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5 relative z-10">
        {/* Live Price Display */}
        <div className="grid grid-cols-2 gap-3">
          <div data-testid="sol-price-display" className="bg-black/50 border border-[rgba(255,255,255,0.1)] p-3 rounded">
            <p className="text-xs text-[#4D4D4D] mb-1">{t('purchase.swap.solPrice')}</p>
            <p className="text-lg font-bold text-white">
              {priceLoading ? '...' : `$${solPrice?.toFixed(2)}`}
            </p>
          </div>
          <div data-testid="ftrx-price-display" className="bg-black/50 border border-[rgba(255,255,255,0.1)] p-3 rounded">
            <p className="text-xs text-[#4D4D4D] mb-1">{t('purchase.swap.ftrxPrice')}</p>
            <p className="text-lg font-bold text-[#00FFD1]">
              {priceLoading ? '...' : ftrxPrice ? `$${ftrxPrice.toFixed(8)}` : '$0.00'}
            </p>
          </div>
        </div>

        {/* Your Balance */}
        <div data-testid="user-balance-display" className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-3 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#4D4D4D]">{t('purchase.swap.yourBalance')}:</span>
            <span className="text-sm font-semibold text-white">
              {balanceLoading ? '...' : userBalance !== null ? `${userBalance.toFixed(4)} SOL` : '0 SOL'}
            </span>
          </div>
        </div>

        {/* SOL Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white">{t('purchase.swap.youPay')}</label>
            <button 
              data-testid="max-sol-btn"
              onClick={handleSetMax}
              className="text-xs text-[#00FFD1] hover:underline"
            >
              {t('purchase.swap.max')}
            </button>
          </div>
          <div className="relative">
            <Input
              data-testid="sol-amount-input"
              type="number"
              placeholder="0.00"
              value={solAmount}
              onChange={(e) => {
                setSolAmount(e.target.value);
                calculateTokens(e.target.value);
              }}
              className="bg-black border-[rgba(255,255,255,0.25)] text-white text-xl h-14 pr-16"
              step="0.001"
              min="0.001"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white font-semibold">SOL</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-10 h-10 bg-[rgba(0,255,209,0.1)] flex items-center justify-center rounded-full border border-[rgba(0,255,209,0.3)]">
            <ArrowDown className="w-5 h-5 text-[#00FFD1]" />
          </div>
        </div>

        {/* Token Output */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">{t('purchase.swap.youReceive')}</label>
          <div data-testid="ftrx-output-display" className="bg-black border border-[rgba(0,255,209,0.3)] p-4 flex items-center justify-between rounded">
            <span className="text-2xl font-bold text-[#00FFD1]">
              {parseFloat(tokenAmount).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#00FFD1] rounded flex items-center justify-center">
                <span className="text-[8px] font-bold text-black">FX</span>
              </div>
              <span className="text-lg font-semibold text-white">FTRX</span>
            </div>
          </div>
        </div>

        {/* Swap Info */}
        <div data-testid="swap-info-panel" className="bg-black/30 border border-[rgba(255,255,255,0.1)] p-3 space-y-2 rounded text-sm">
          <div className="flex justify-between">
            <span className="text-[#4D4D4D]">{t('purchase.swap.rate')}</span>
            <span className="text-white">1 SOL = ~{currentRate} FTRX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4D4D4D]">{t('purchase.swap.network')}</span>
            <span className="text-white">{t('purchase.swap.solanaMainnet')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4D4D4D]">{t('purchase.swap.dex')}</span>
            <span className="text-[#00FFD1]">Raydium</span>
          </div>
        </div>

        {/* Purchase Button */}
        <Button
          data-testid="swap-purchase-btn"
          onClick={handlePurchase}
          disabled={loading || !solAmount || parseFloat(solAmount) <= 0}
          className="btn-primary w-full h-14 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('purchase.swap.processing')}
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              {t('purchase.swap.swapButton')}
            </>
          )}
        </Button>

        <p data-testid="swap-disclaimer" className="text-xs text-center text-[#4D4D4D]">
          {t('purchase.swap.swapInfo')}
        </p>
      </CardContent>
    </Card>
  );
};
