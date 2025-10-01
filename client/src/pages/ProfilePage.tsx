import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Award, DollarSign } from "lucide-react";
import type { UserStats, Position } from "@shared/schema";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:address");
  const address = params?.address;

  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user-stats/${address}`],
    enabled: !!address,
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: [`/api/positions/user/${address}`],
    enabled: !!address,
  });

  if (!stats) {
    return (
      <div className="container px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground">This user does not exist or has no trading history.</p>
        </div>
      </div>
    );
  }

  const openPositions = positions?.filter(p => p.status === "open") || [];

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold font-mono mb-2" data-testid="text-user-address">
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </h1>
            <div className="flex gap-2">
              {stats.badges.map((badge) => (
                <Badge key={badge} variant="secondary" data-testid={`badge-${badge.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Award className="h-3 w-3 mr-1" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" data-testid="button-follow">Follow</Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total P&L</span>
            </div>
            <div className={`text-3xl font-bold ${Number(stats.totalPnL) >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-total-pnl">
              ${Number(stats.totalPnL).toLocaleString()}
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm">Win Rate</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-win-rate">
              {Number(stats.winRate).toFixed(1)}%
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">ROI</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-roi">
              {Number(stats.roi).toFixed(1)}%
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Award className="h-4 w-4" />
              <span className="text-sm">Markets Traded</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-markets-traded">
              {stats.marketsTraded}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">24h P&L</span>
              <span className={`font-semibold ${Number(stats.pnL24h) >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-pnl-24h">
                ${Number(stats.pnL24h).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">7d P&L</span>
              <span className={`font-semibold ${Number(stats.pnL7d) >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-pnl-7d">
                ${Number(stats.pnL7d).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">30d P&L</span>
              <span className={`font-semibold ${Number(stats.pnL30d) >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-pnl-30d">
                ${Number(stats.pnL30d).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Volume</span>
              <span className="font-semibold" data-testid="text-total-volume">
                ${(Number(stats.totalVolume) / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Active Positions</h3>
          {openPositions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active positions</p>
          ) : (
            <div className="space-y-3">
              {openPositions.slice(0, 5).map((position) => (
                <div key={position.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30" data-testid={`position-${position.id}`}>
                  <div>
                    <div className="font-medium text-sm">Market #{position.marketId.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{position.outcome}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${Number(position.unrealizedPnL) >= 0 ? "text-success" : "text-destructive"}`}>
                      ${Number(position.unrealizedPnL).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Number(position.shares).toFixed(2)} shares
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
