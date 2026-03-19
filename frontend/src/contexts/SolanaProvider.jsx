import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaProvider = ({ children }) => {
  // Use Mainnet for production (real SOL balances)
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use a reliable public RPC endpoint for Mainnet
  // You can also use: https://api.mainnet-beta.solana.com
  const endpoint = useMemo(() => {
    // Primary: Solana's official mainnet RPC
    return 'https://api.mainnet-beta.solana.com';
  }, []);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
