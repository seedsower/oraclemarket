import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, TrendingUp, DollarSign } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
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
  const { address } = useWallet();

  const { data: stake } = useQuery<Stake>({
    queryKey: [`/api/stakes/${address}`],
    enabled: !!address,
  });

  const { data: allStakes } = useQuery<Stake[]>({
    queryKey: ["/api/stakes"],
  });

  const stakedAmount = Number(stake?.amount || 0);
  const pendingRewards = Number(stake?.pendingRewards || 0);
  const currentTier = stake?.tier || "bronze";

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
                <Button data-testid="button-stake">Stake</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Balance: 50,000 ORACLE
              </p>
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
                <Button variant="outline" data-testid="button-unstake">Unstake</Button>
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
              <Button size="lg" data-testid="button-claim-rewards">
                <Coins className="h-4 w-4 mr-2" />
                Claim Rewards
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
