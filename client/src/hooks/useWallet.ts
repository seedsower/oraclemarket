import { useAccount, useBalance } from "wagmi";
import { CONTRACTS } from "@/contracts/config";

export function useWallet() {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({
    address,
    token: CONTRACTS.OracleToken,
    query: {
      enabled: Boolean(address),
    },
  });

  return {
    address: address || null,
    isConnected,
    balance: balanceData ? Number(balanceData.formatted) : 0,
  };
}
