import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowRight, Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const TokenPurchase = () => {
  const { t } = useTranslation();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [solAmount, setSolAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('0');
  const [loading, setLoading] = useState(false);

  // FuturoX AI price: 1 SOL = 10,000 FTRX
  const FTRX_RATE = 10000;
  
  // Treasury wallet (placeholder - for production use real address)
  const TREASURY_WALLET = 'FuturoXAITreasuryWa11et111111111111111111111';

  const calculateTokens = (sol) => {
    const amount = parseFloat(sol) || 0;
    setTokenAmount((amount * FTRX_RATE).toFixed(2));
  };

  const handlePurchase = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error(t('purchase.connectFirst'));
      return;
    }

    if (!solAmount || parseFloat(solAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(solAmount);
    if (amount < 0.01) {
      toast.error(t('purchase.minimum'));
      return;
    }

    try {
      setLoading(true);
      
      // Get current balance
      const balance = await connection.getBalance(publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;
      
      if (balanceSol < amount) {
        toast.error(`Insufficient balance. You have ${balanceSol.toFixed(4)} SOL`);
        return;
      }

      // Create transaction (simulation - in production use real smart contract)
      toast.info('Transaction simulation - In production, this will use a real smart contract');
      
      // Simulation
      setTimeout(() => {
        toast.success(`Successfully purchased ${tokenAmount} FTRX!`, {
          description: `Spent ${solAmount} SOL`,
        });
        setSolAmount('');
        setTokenAmount('0');
        setLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Transaction failed. Please try again.');
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <Card className="bg-[#121212] border-[rgba(255,255,255,0.25)]">
        <CardHeader>
          <CardTitle className="text-white">{t('purchase.title')}</CardTitle>
          <CardDescription className="text-[rgba(255,255,255,0.85)]">
            {t('purchase.connectFirst')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-[#121212] border-[rgba(255,255,255,0.25)]">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-[rgba(0,255,209,0.1)] flex items-center justify-center">
            <Coins className="w-6 h-6 text-[#00FFD1]" />
          </div>
          <div>
            <CardTitle className="text-white">{t('purchase.title')}</CardTitle>
            <CardDescription className="text-[rgba(255,255,209,0.85)]">
              {t('purchase.exchangeRate')}: 1 SOL = {FTRX_RATE.toLocaleString()} FTRX
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SOL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">{t('purchase.amountLabel')}</label>
          <Input
            type="number"
            placeholder="0.00"
            value={solAmount}
            onChange={(e) => {
              setSolAmount(e.target.value);
              calculateTokens(e.target.value);
            }}
            className="bg-black border-[rgba(255,255,255,0.25)] text-white text-lg h-14"
            step="0.01"
            min="0.01"
          />
          <p className="text-xs text-[#4D4D4D]">{t('purchase.minimum')}</p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-10 h-10 bg-[rgba(0,255,209,0.1)] flex items-center justify-center rounded-full">
            <ArrowRight className="w-5 h-5 text-[#00FFD1] transform rotate-90" />
          </div>
        </div>

        {/* Token Output */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">{t('purchase.youWillReceive')}</label>
          <div className="bg-black border border-[rgba(255,255,255,0.25)] p-4 flex items-center justify-between">
            <span className="text-2xl font-bold text-[#00FFD1]">
              {parseFloat(tokenAmount).toLocaleString()}
            </span>
            <span className="text-lg font-semibold text-white">FTRX</span>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="bg-[rgba(0,255,209,0.05)] border border-[rgba(0,255,209,0.2)] p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#4D4D4D]">{t('purchase.network')}</span>
            <span className="text-white font-medium">{t('purchase.devnet')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#4D4D4D]">{t('purchase.transactionFee')}</span>
            <span className="text-white font-medium">~0.000005 SOL</span>
          </div>
        </div>

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={loading || !solAmount || parseFloat(solAmount) <= 0}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('purchase.processing')}
            </>
          ) : (
            <>
              {t('purchase.buyButton')}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-[#4D4D4D]">
          {t('purchase.terms')}
        </p>
      </CardContent>
    </Card>
  );
};
