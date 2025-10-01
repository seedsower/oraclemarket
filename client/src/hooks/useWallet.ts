import { create } from "zustand";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  connect: () => void;
  disconnect: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  isConnected: false,
  address: null,
  balance: 10000,
  connect: () => {
    const mockAddress = "0x" + Math.random().toString(16).substring(2, 42).padEnd(40, "0");
    set({ isConnected: true, address: mockAddress });
  },
  disconnect: () => {
    set({ isConnected: false, address: null });
  },
}));
