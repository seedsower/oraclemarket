import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/useWallet";
import type { Position, UserStats } from "@shared/schema";

export default function PortfolioPage() {
  const { address } = useWallet();
  
  const { data: positions } = useQuery<Position[]>({
    queryKey: [`/api/positions/user/${address}`],
    enabled: !!address,
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: [`/api/user-stats/${address}`],
    enabled: !!address,
  });

  const openPositions = positions?.filter(p => p.status === "open") || [];
  const closedPositions = positions?.filter(p => p.status === "closed") || [];

  const totalValue = openPositions.reduce((sum, p) => sum + Number(p.totalCost), 0);
  const totalPnL = openPositions.reduce((sum, p) => sum + Number(p.unrealizedPnL), 0);
  const pnLPercentage = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Portfolio</h1>
        <p className="text-muted-foreground">Track your positions and performance</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Portfolio Value</span>
          </div>
          <div className="text-3xl font-bold" data-testid="text-portfolio-value">
            ${totalValue.toFixed(2)}
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm">Total P&L</span>
          </div>
          <div className={`text-3xl font-bold ${totalPnL >= 0 ? "text-success" : "text-destructive"}`} data-testid="text-total-pnl">
            ${totalPnL.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {pnLPercentage >= 0 ? "+" : ""}{pnLPercentage.toFixed(2)}%
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">24h P&L</div>
          <div className="text-3xl font-bold text-success" data-testid="text-pnl-24h">
            ${stats?.pnL24h || "0.00"}
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">Win Rate</div>
          <div className="text-3xl font-bold" data-testid="text-win-rate">
            {stats?.winRate || "0"}%
          </div>
        </Card>
      </div>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open" data-testid="tab-open-positions">
            Open Positions ({openPositions.length})
          </TabsTrigger>
          <TabsTrigger value="closed" data-testid="tab-closed-positions">
            Closed Positions ({closedPositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-6">
          {openPositions.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-muted-foreground mb-4">No open positions</p>
              <Link href="/markets">
                <Button data-testid="button-explore-markets">Explore Markets</Button>
              </Link>
            </Card>
          ) : (
            <Card className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left p-4">Market</th>
                      <th className="text-left p-4">Outcome</th>
                      <th className="text-right p-4">Shares</th>
                      <th className="text-right p-4">Avg Price</th>
                      <th className="text-right p-4">Total Cost</th>
                      <th className="text-right p-4">Unrealized P&L</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((position) => (
                      <tr key={position.id} className="border-b border-border/50" data-testid={`position-${position.id}`}>
                        <td className="p-4">
                          <Link href={`/markets/${position.marketId}`} className="hover:underline">
                            Market #{position.marketId.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="p-4">
                          <span className={position.outcome === "yes" ? "text-success" : "text-destructive"}>
                            {position.outcome}
                          </span>
                        </td>
                        <td className="text-right p-4">{Number(position.shares).toFixed(2)}</td>
                        <td className="text-right p-4">${Number(position.averagePrice).toFixed(2)}</td>
                        <td className="text-right p-4">${Number(position.totalCost).toFixed(2)}</td>
                        <td className={`text-right p-4 font-semibold ${Number(position.unrealizedPnL) >= 0 ? "text-success" : "text-destructive"}`}>
                          ${Number(position.unrealizedPnL).toFixed(2)}
                        </td>
                        <td className="text-right p-4">
                          <Button size="sm" variant="outline" data-testid={`button-exit-${position.id}`}>
                            Exit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {closedPositions.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No closed positions yet</p>
            </Card>
          ) : (
            <Card className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left p-4">Market</th>
                      <th className="text-left p-4">Outcome</th>
                      <th className="text-right p-4">Shares</th>
                      <th className="text-right p-4">Total Cost</th>
                      <th className="text-right p-4">Realized P&L</th>
                      <th className="text-right p-4">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.map((position) => (
                      <tr key={position.id} className="border-b border-border/50" data-testid={`closed-position-${position.id}`}>
                        <td className="p-4">Market #{position.marketId.slice(0, 8)}</td>
                        <td className="p-4">
                          <span className={position.outcome === "yes" ? "text-success" : "text-destructive"}>
                            {position.outcome}
                          </span>
                        </td>
                        <td className="text-right p-4">{Number(position.shares).toFixed(2)}</td>
                        <td className="text-right p-4">${Number(position.totalCost).toFixed(2)}</td>
                        <td className={`text-right p-4 font-semibold ${Number(position.realizedPnL) >= 0 ? "text-success" : "text-destructive"}`}>
                          ${Number(position.realizedPnL).toFixed(2)}
                        </td>
                        <td className="text-right p-4 text-sm text-muted-foreground">
                          {position.closedAt && new Date(position.closedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
