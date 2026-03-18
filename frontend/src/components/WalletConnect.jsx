import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet } from 'lucide-react';

export const WalletConnect = () => {
  const { t } = useTranslation();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      console.log('Fetching balance for:', publicKey.toString());
      console.log('Connection endpoint:', connection.rpcEndpoint);
      const bal = await connection.getBalance(publicKey);
      console.log('Raw balance (lamports):', bal);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey, fetchBalance]);

  if (!connected) {
    return (
      <Card className="bg-[#121212] border-[rgba(255,255,255,0.25)] max-w-md mx-auto">
        <CardHeader>
          <div className="w-16 h-16 bg-[rgba(0,255,209,0.1)] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-[#00FFD1]" />
          </div>
          <CardTitle className="text-white text-center">{t('wallet.connectTitle')}</CardTitle>
          <CardDescription className="text-center text-[rgba(255,255,255,0.85)]">
            {t('wallet.connectDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <WalletMultiButton className="btn-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#121212] border-[rgba(255,255,255,0.25)] max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-white">{t('wallet.connectedTitle')}</CardTitle>
        <CardDescription className="text-[rgba(255,255,255,0.85)]">
          {t('wallet.connectedDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-[#4D4D4D] uppercase">{t('wallet.walletAddress')}</p>
          <p className="text-sm font-mono text-white break-all bg-black p-3 border border-[rgba(255,255,255,0.25)]">
            {publicKey?.toString()}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-[#4D4D4D] uppercase">{t('wallet.balance')}</p>
          <p className="text-3xl font-bold text-[#00FFD1]">
            {loading ? 'Loading...' : balance.toFixed(4)} SOL
          </p>
        </div>

        <WalletMultiButton className="btn-secondary w-full" />
      </CardContent>
    </Card>
  );
};
