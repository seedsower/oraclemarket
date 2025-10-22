import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, TrendingUp, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useStakedAmount, usePendingRewards, useStake, useUnstake, useClaimRewards, useOracleTokenBalance, useApproveToken } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { parseUnits, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/contracts/config";
import type { Stake } from "@shared/schema";

const TIER_THRESHOLDS = {
  bronze: 100,
  silver: 1000,
  gold: 10000,
  platinum: 100000,
};

const TIER_BENEFITS = {
  bronze: { apy: "8%", feeDiscount: "5%", votingPower: "1x" },
  silver: { apy: "12%", feeDiscount: "10%", votingPower: "1.5x" },
  gold: { apy: "18%", feeDiscount: "20%", votingPower: "2x" },
  platinum: { apy: "25%", feeDiscount: "30%", votingPower: "3x" },
};

export default function StakingPage() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const { address, isConnected } = useWallet();
  const { toast } = useToast();

  const { data: stakedAmountData } = useStakedAmount(address as `0x${string}`);
  const { data: pendingRewardsData } = usePendingRewards(address as `0x${string}`);
  const { data: oracleBalance } = useOracleTokenBalance(address as `0x${string}`);

  const { stake: stakeTokens, isConfirming: isStaking, isSuccess: isStakeSuccess } = useStake();
  const { unstake: unstakeTokens, isConfirming: isUnstaking, isSuccess: isUnstakeSuccess } = useUnstake();
  const { claimRewards, isConfirming: isClaiming, isSuccess: isClaimSuccess } = useClaimRewards();
  const { approve, isConfirming: isApproving, isSuccess: isApprovalSuccess } = useApproveToken();

  // Check allowance
  const { data: allowance } = useReadContract({
    address: CONTRACTS.OracleToken,
    abi: [
      {
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "allowance",
    args: address ? [address, CONTRACTS.Staking] : undefined,
  });

  const { data: stake } = useQuery<Stake>({
    queryKey: [`/api/stakes/${address}`],
    enabled: !!address,
  });

  const { data: allStakes } = useQuery<Stake[]>({
    queryKey: ["/api/stakes"],
  });

  const stakedAmount = stakedAmountData ? Number(formatUnits(stakedAmountData as bigint, 18)) : 0;
  const pendingRewards = pendingRewardsData ? Number(formatUnits(pendingRewardsData as bigint, 18)) : 0;
  const balance = oracleBalance ? Number(formatUnits(oracleBalance as bigint, 18)) : 0;

  const stakeAmountBigInt = stakeAmount ? parseUnits(stakeAmount, 18) : BigInt(0);
  const hasApproval = allowance && stakeAmountBigInt > BigInt(0) && allowance >= stakeAmountBigInt;

  const getTier = (amount: number) => {
    if (amount >= 100000) return "platinum";
    if (amount >= 10000) return "gold";
    if (amount >= 1000) return "silver";
    return "bronze";
  };

  const currentTier = getTier(stakedAmount);

  useEffect(() => {
    if (isStakeSuccess) {
      toast({
        title: "Staking Successful!",
        description: `Staked ${stakeAmount} ORACLE tokens`,
      });
      setStakeAmount("");
    }
  }, [isStakeSuccess]);

  useEffect(() => {
    if (isUnstakeSuccess) {
      toast({
        title: "Unstaking Successful!",
        description: `Unstaked ${unstakeAmount} ORACLE tokens`,
      });
      setUnstakeAmount("");
    }
  }, [isUnstakeSuccess]);

  useEffect(() => {
    if (isClaimSuccess) {
      toast({
        title: "Rewards Claimed!",
        description: `Claimed ${pendingRewards.toFixed(2)} ORACLE tokens`,
      });
    }
  }, [isClaimSuccess]);

  const handleApprove = () => {
    if (!stakeAmount || Number(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseUnits(stakeAmount, 18);
      approve(CONTRACTS.Staking, amount);
      toast({
        title: "Approval Submitted",
        description: "Please confirm the approval in your wallet...",
      });
    } catch (error) {
      console.error("Approval error:", error);
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleStake = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to stake",
        variant: "destructive",
      });
      return;
    }

    if (!stakeAmount || Number(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseUnits(stakeAmount, 18);
      stakeTokens(amount);
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
    } catch (error) {
      console.error("Stake error:", error);
      toast({
        title: "Staking Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleUnstake = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to unstake",
        variant: "destructive",
      });
      return;
    }

    if (!unstakeAmount || Number(unstakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseUnits(unstakeAmount, 18);
      unstakeTokens(amount);
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });
    } catch (error) {
      console.error("Unstake error:", error);
      toast({
        title: "Unstaking Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleClaimRewards = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      });
      return;
    }

    if (pendingRewards <= 0) {
      toast({
        title: "No Rewards",
        description: "You don't have any pending rewards",
        variant: "destructive",
      });
      return;
    }

    try {
      claimRewards();
      toast({
        title: "Transaction Submitted",
        description: "Claiming your rewards...",
      });
    } catch (error) {
      console.error("Claim error:", error);
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const nextTier = currentTier === "bronze" ? "silver" : currentTier === "silver" ? "gold" : currentTier === "gold" ? "platinum" : null;
  const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS] : null;
  const progressToNextTier = nextTierThreshold ? (stakedAmount / nextTierThreshold) * 100 : 100;

  const topStakers = allStakes?.slice(0, 10) || [];

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Staking</h1>
        <p className="text-muted-foreground">Stake ORACLE tokens to earn rewards and unlock benefits</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Staking</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize" data-testid="badge-tier">
                  {currentTier} Tier
                </Badge>
                <span className="text-sm text-muted-foreground">
                  APY: {TIER_BENEFITS[currentTier as keyof typeof TIER_BENEFITS].apy}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" data-testid="text-staked-amount">
                {stakedAmount.toLocaleString()} ORACLE
              </div>
              <div className="text-sm text-muted-foreground">
                ≈ ${(stakedAmount * 1.5).toLocaleString()}
              </div>
            </div>
          </div>

          {nextTier && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress to {nextTier} tier</span>
                <span className="font-medium">{progressToNextTier.toFixed(1)}%</span>
              </div>
              <Progress value={progressToNextTier} className="h-2" data-testid="progress-next-tier" />
              <p className="text-xs text-muted-foreground mt-2">
                Stake {(nextTierThreshold! - stakedAmount).toLocaleString()} more ORACLE to unlock {nextTier} tier
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="stake-amount">Stake Amount</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="stake-amount"
                  type="number"
                  placeholder="0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  data-testid="input-stake-amount"
                />
                {!hasApproval ? (
                  <Button
                    onClick={handleApprove}
                    disabled={!isConnected || !stakeAmount || Number(stakeAmount) <= 0 || isApproving}
                    data-testid="button-approve"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      "Approve"
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStake}
                    disabled={!isConnected || !stakeAmount || Number(stakeAmount) <= 0 || isStaking}
                    data-testid="button-stake"
                  >
                    {isStaking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Staking...
                      </>
                    ) : (
                      "Stake"
                    )}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Balance: {balance.toLocaleString()} ORACLE
                </p>
                {hasApproval && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle className="h-3 w-3" />
                    Approved
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="unstake-amount">Unstake Amount</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="unstake-amount"
                  type="number"
                  placeholder="0"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  data-testid="input-unstake-amount"
                />
                <Button 
                  variant="outline"
                  onClick={handleUnstake}
                  disabled={!isConnected || !unstakeAmount || Number(unstakeAmount) <= 0 || isUnstaking}
                  data-testid="button-unstake"
                >
                  {isUnstaking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unstaking...
                    </>
                  ) : (
                    "Unstake"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                7-day cooldown period applies
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-primary/10 p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Pending Rewards</div>
                <div className="text-2xl font-bold" data-testid="text-pending-rewards">
                  {pendingRewards.toFixed(2)} ORACLE
                </div>
              </div>
              <Button 
                size="lg"
                onClick={handleClaimRewards}
                disabled={!isConnected || pendingRewards <= 0 || isClaiming}
                data-testid="button-claim-rewards"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Claim Rewards
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Tier Benefits</h3>
          <div className="space-y-4">
            {Object.entries(TIER_BENEFITS).map(([tier, benefits]) => (
              <div
                key={tier}
                className={`p-4 rounded-lg border ${
                  tier === currentTier ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold capitalize">{tier}</span>
                  {tier === currentTier && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    APY: {benefits.apy}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Fee Discount: {benefits.feeDiscount}
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-3 w-3" />
                    Voting Power: {benefits.votingPower}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Stakers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-sm text-muted-foreground">
                <th className="text-left p-3">Rank</th>
                <th className="text-left p-3">Address</th>
                <th className="text-right p-3">Staked Amount</th>
                <th className="text-right p-3">Tier</th>
                <th className="text-right p-3">Rewards Claimed</th>
              </tr>
            </thead>
            <tbody>
              {topStakers.map((s, index) => (
                <tr key={s.id} className="border-b border-border/50" data-testid={`staker-${index + 1}`}>
                  <td className="p-3">
                    <span className={index < 3 ? "font-bold text-primary" : ""}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-sm">
                    {s.userAddress.slice(0, 6)}...{s.userAddress.slice(-4)}
                  </td>
                  <td className="text-right p-3 font-semibold">
                    {Number(s.amount).toLocaleString()} ORACLE
                  </td>
                  <td className="text-right p-3">
                    <Badge variant="outline" className="capitalize">{s.tier}</Badge>
                  </td>
                  <td className="text-right p-3 text-muted-foreground">
                    {Number(s.claimedRewards).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
