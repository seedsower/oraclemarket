import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Target, DollarSign, Award } from "lucide-react";
import type { UserStats } from "@shared/schema";

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("all");

  const { data: leaderboard } = useQuery<UserStats[]>({
    queryKey: ["/api/leaderboard"],
  });

  const sortedByPeriod = leaderboard?.slice().sort((a, b) => {
    if (period === "24h") return Number(b.pnL24h) - Number(a.pnL24h);
    if (period === "7d") return Number(b.pnL7d) - Number(a.pnL7d);
    if (period === "30d") return Number(b.pnL30d) - Number(a.pnL30d);
    return Number(b.totalPnL) - Number(a.totalPnL);
  }) || [];

  const topThree = sortedByPeriod.slice(0, 3);
  const rest = sortedByPeriod.slice(3);

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="text-page-title">
          <Trophy className="h-10 w-10 text-primary" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">Top traders and their performance</p>
      </div>

      <Tabs value={period} onValueChange={setPeriod} className="mb-8">
        <TabsList>
          <TabsTrigger value="24h" data-testid="tab-24h">24 Hours</TabsTrigger>
          <TabsTrigger value="7d" data-testid="tab-7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d" data-testid="tab-30d">30 Days</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {topThree.map((user, index) => {
          const pnl = period === "24h" ? user.pnL24h : period === "7d" ? user.pnL7d : period === "30d" ? user.pnL30d : user.totalPnL;
          
          return (
            <Card
              key={user.userAddress}
              className={`glass-card p-6 ${index === 0 ? "glow-effect border-primary" : ""}`}
              data-testid={`top-trader-${index + 1}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`
                    flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold
                    ${index === 0 ? "bg-yellow-500/20 text-yellow-500" : ""}
                    ${index === 1 ? "bg-gray-400/20 text-gray-400" : ""}
                    ${index === 2 ? "bg-orange-600/20 text-orange-600" : ""}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-mono text-sm" data-testid={`text-address-${index + 1}`}>
                      {user.userAddress.slice(0, 6)}...{user.userAddress.slice(-4)}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {user.badges.slice(0, 2).map((badge) => (
                        <Badge key={badge} variant="secondary" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Trophy className={`h-8 w-8 ${index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-orange-600"}`} />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">P&L</div>
                  <div className="text-2xl font-bold text-success" data-testid={`text-pnl-${index + 1}`}>
                    ${Number(pnl).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-semibold" data-testid={`text-winrate-${index + 1}`}>
                      {Number(user.winRate).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ROI</div>
                    <div className="font-semibold" data-testid={`text-roi-${index + 1}`}>
                      {Number(user.roi).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <Link href={`/profile/${user.userAddress}`}>
                  <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-profile-${index + 1}`}>
                    View Profile
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-sm text-muted-foreground">
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4">Trader</th>
                <th className="text-right p-4">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="h-4 w-4" />
                    P&L
                  </div>
                </th>
                <th className="text-right p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Target className="h-4 w-4" />
                    Win Rate
                  </div>
                </th>
                <th className="text-right p-4">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp className="h-4 w-4" />
                    ROI
                  </div>
                </th>
                <th className="text-right p-4">
                  <div className="flex items-center justify-end gap-2">
                    <Award className="h-4 w-4" />
                    Volume
                  </div>
                </th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((user, index) => {
                const rank = index + 4;
                const pnl = period === "24h" ? user.pnL24h : period === "7d" ? user.pnL7d : period === "30d" ? user.pnL30d : user.totalPnL;
                
                return (
                  <tr key={user.userAddress} className="border-b border-border/50" data-testid={`trader-${rank}`}>
                    <td className="p-4">
                      <span className="font-semibold">#{rank}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm" data-testid={`text-address-${rank}`}>
                          {user.userAddress.slice(0, 6)}...{user.userAddress.slice(-4)}
                        </div>
                        {user.badges.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {user.badges[0]}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <span className={`font-semibold ${Number(pnl) >= 0 ? "text-success" : "text-destructive"}`} data-testid={`text-pnl-${rank}`}>
                        ${Number(pnl).toLocaleString()}
                      </span>
                    </td>
                    <td className="text-right p-4" data-testid={`text-winrate-${rank}`}>
                      {Number(user.winRate).toFixed(1)}%
                    </td>
                    <td className="text-right p-4" data-testid={`text-roi-${rank}`}>
                      {Number(user.roi).toFixed(1)}%
                    </td>
                    <td className="text-right p-4" data-testid={`text-volume-${rank}`}>
                      ${(Number(user.totalVolume) / 1000).toFixed(0)}K
                    </td>
                    <td className="text-right p-4">
                      <Link href={`/profile/${user.userAddress}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-${rank}`}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
