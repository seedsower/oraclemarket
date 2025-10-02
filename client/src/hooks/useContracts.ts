import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { 
  CONTRACTS,
  OracleTokenABI,
  MockUSDCABI,
  MarketFactoryABI,
  HybridAMMABI,
  StakingABI,
  GovernanceABI,
  OrderBookABI,
} from "@/contracts/config";
import type { Address } from "viem";

// Oracle Token Hooks
export function useOracleTokenBalance(address?: Address) {
  return useReadContract({
    address: CONTRACTS.OracleToken,
    abi: OracleTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useApproveToken() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (spender: Address, amount: bigint) => {
    writeContract({
      address: CONTRACTS.OracleToken,
      abi: OracleTokenABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    approve,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// MockUSDC Hooks
export function useMockUSDCBalance(address?: Address) {
  return useReadContract({
    address: CONTRACTS.MockUSDC,
    abi: MockUSDCABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useApproveMockUSDC() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (spender: Address, amount: bigint) => {
    writeContract({
      address: CONTRACTS.MockUSDC,
      abi: MockUSDCABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    approve,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// Market Factory Hooks
export function useMarketCount() {
  return useReadContract({
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: "getMarketCount",
  });
}

export function useMarket(marketId?: bigint) {
  return useReadContract({
    address: CONTRACTS.MarketFactory,
    abi: MarketFactoryABI,
    functionName: "getMarket",
    args: marketId !== undefined ? [marketId] : undefined,
    query: {
      enabled: marketId !== undefined,
    },
  });
}

export function useCreateMarket() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createMarket = (
    question: string,
    outcomes: string[],
    closingTime: bigint,
    resolutionSource: bigint,
    settlementToken: Address
  ) => {
    writeContract({
      address: CONTRACTS.MarketFactory,
      abi: MarketFactoryABI,
      functionName: "createMarket",
      args: [question, outcomes, closingTime, resolutionSource, settlementToken],
    });
  };

  return {
    createMarket,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// Hybrid AMM Hooks
export function useGetPrice(marketId?: bigint, outcome?: bigint) {
  return useReadContract({
    address: CONTRACTS.HybridAMM,
    abi: HybridAMMABI,
    functionName: "getPrice",
    args: marketId !== undefined && outcome !== undefined ? [marketId, outcome] : undefined,
    query: {
      enabled: marketId !== undefined && outcome !== undefined,
    },
  });
}

export function useGetBuyPrice(marketId?: bigint, outcome?: bigint, amount?: bigint) {
  return useReadContract({
    address: CONTRACTS.HybridAMM,
    abi: HybridAMMABI,
    functionName: "getBuyPrice",
    args: marketId !== undefined && outcome !== undefined && amount !== undefined 
      ? [marketId, outcome, amount] 
      : undefined,
    query: {
      enabled: marketId !== undefined && outcome !== undefined && amount !== undefined,
    },
  });
}

export function useBuyShares() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buy = (marketId: bigint, outcome: bigint, amount: bigint) => {
    writeContract({
      address: CONTRACTS.HybridAMM,
      abi: HybridAMMABI,
      functionName: "buy",
      args: [marketId, outcome, amount],
    });
  };

  return {
    buy,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

export function useSellShares() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const sell = (marketId: bigint, outcome: bigint, shares: bigint) => {
    writeContract({
      address: CONTRACTS.HybridAMM,
      abi: HybridAMMABI,
      functionName: "sell",
      args: [marketId, outcome, shares],
    });
  };

  return {
    sell,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// Staking Hooks
export function useStakedAmount(address?: Address) {
  return useReadContract({
    address: CONTRACTS.Staking,
    abi: StakingABI,
    functionName: "getStakedAmount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function usePendingRewards(address?: Address) {
  return useReadContract({
    address: CONTRACTS.Staking,
    abi: StakingABI,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useUserTier(address?: Address) {
  return useReadContract({
    address: CONTRACTS.Staking,
    abi: StakingABI,
    functionName: "getUserTier",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useStake() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const stake = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.Staking,
      abi: StakingABI,
      functionName: "stake",
      args: [amount],
    });
  };

  return {
    stake,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

export function useUnstake() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const unstake = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.Staking,
      abi: StakingABI,
      functionName: "unstake",
      args: [amount],
    });
  };

  return {
    unstake,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

export function useClaimRewards() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimRewards = () => {
    writeContract({
      address: CONTRACTS.Staking,
      abi: StakingABI,
      functionName: "claimRewards",
    });
  };

  return {
    claimRewards,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// Governance Hooks
export function useProposalCount() {
  return useReadContract({
    address: CONTRACTS.Governance,
    abi: GovernanceABI,
    functionName: "getProposalCount",
  });
}

export function useProposal(proposalId?: bigint) {
  return useReadContract({
    address: CONTRACTS.Governance,
    abi: GovernanceABI,
    functionName: "getProposal",
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== undefined,
    },
  });
}

export function useCreateProposal() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createProposal = (title: string, description: string) => {
    writeContract({
      address: CONTRACTS.Governance,
      abi: GovernanceABI,
      functionName: "createProposal",
      args: [title, description],
    });
  };

  return {
    createProposal,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

export function useVote() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const vote = (proposalId: bigint, support: boolean) => {
    writeContract({
      address: CONTRACTS.Governance,
      abi: GovernanceABI,
      functionName: "vote",
      args: [proposalId, support],
    });
  };

  return {
    vote,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

// OrderBook Hooks
export function useGetOrderBook(marketId?: bigint, outcome?: bigint) {
  return useReadContract({
    address: CONTRACTS.OrderBook,
    abi: OrderBookABI,
    functionName: "getOrderBook",
    args: marketId !== undefined && outcome !== undefined ? [marketId, outcome] : undefined,
    query: {
      enabled: marketId !== undefined && outcome !== undefined,
    },
  });
}

export function usePlaceOrder() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const placeOrder = (
    marketId: bigint,
    outcome: bigint,
    price: bigint,
    amount: bigint,
    isBuy: boolean
  ) => {
    writeContract({
      address: CONTRACTS.OrderBook,
      abi: OrderBookABI,
      functionName: "placeOrder",
      args: [marketId, outcome, price, amount, isBuy],
    });
  };

  return {
    placeOrder,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}

export function useCancelOrder() {
  const { data: hash, writeContract, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const cancelOrder = (orderId: bigint) => {
    writeContract({
      address: CONTRACTS.OrderBook,
      abi: OrderBookABI,
      functionName: "cancelOrder",
      args: [orderId],
    });
  };

  return {
    cancelOrder,
    hash,
    isConfirming,
    isSuccess,
    ...rest,
  };
}
