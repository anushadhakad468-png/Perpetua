'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SavedWallet {
  address: string;
  provider: string;
  lastConnected: number;
}

interface WalletContextType {
  activeWallet: string | null;
  savedWallets: SavedWallet[];
  isConnecting: boolean;
  connect: (provider: string) => Promise<void>;
  disconnect: () => void;
  removeSavedWallet: (address: string) => void;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore previously connected wallets history
  useEffect(() => {
    const history = localStorage.getItem('perpetua_wallets');
    if (history) setSavedWallets(JSON.parse(history));
  }, []);

  const saveWalletHistory = (newWallets: SavedWallet[]) => {
    localStorage.setItem('perpetua_wallets', JSON.stringify(newWallets));
    setSavedWallets(newWallets);
  };

  const connect = async (provider: string) => {
    setIsConnecting(true);
    // Simulate wallet provider request (e.g., window.ethereum.request)
    setTimeout(() => {
      const mockAddress = '0xb0c95673c0dd05838723cFBd363dA196803F77b5'; // From your existing Python .env setup
      setActiveWallet(mockAddress);
      
      const exists = savedWallets.find(w => w.address === mockAddress);
      if (!exists) {
        saveWalletHistory([...savedWallets, { address: mockAddress, provider, lastConnected: Date.now() }]);
      } else {
        const updated = savedWallets.map(w => w.address === mockAddress ? { ...w, lastConnected: Date.now() } : w);
        saveWalletHistory(updated);
      }
      setIsConnecting(false);
    }, 800);
  };

  const disconnect = () => setActiveWallet(null);
  const removeSavedWallet = (address: string) => saveWalletHistory(savedWallets.filter(w => w.address !== address));

  return (
    <WalletContext.Provider value={{ activeWallet, savedWallets, isConnecting, connect, disconnect, removeSavedWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);