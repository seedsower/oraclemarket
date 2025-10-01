import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, Clock, Info } from "lucide-react";
import { TradingPanel } from "@/components/trading/TradingPanel";
import { PriceChart } from "@/components/charts/PriceChart";
import { OrderBook } from "@/components/trading/OrderBook";
import { ActivityFeed } from "@/components/trading/ActivityFeed";
import type { Market } from "@shared/schema";

export default function MarketDetailPage() {
  const [, params] = useRoute("/markets/:id");
  const marketId = params?.id;

  const { data: market, isLoading } = useQuery<Market>({
    queryKey: [`/api/markets/${marketId}`],
    enabled: !!marketId,
  });

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="h-96 bg-muted rounded md:col-span-2" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Market Not Found</h2>
          <p className="text-muted-foreground">This market does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" data-testid="badge-category">{market.category}</Badge>
          <Badge variant="outline" className="capitalize" data-testid="badge-status">
            {market.status}
          </Badge>
          {market.isFeatured && (
            <Badge className="bg-accent text-accent-foreground">Featured</Badge>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-market-question">
          {market.question}
        </h1>

        {market.description && (
          <p className="text-muted-foreground mb-6" data-testid="text-market-description">
            {market.description}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Volume 24h</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-volume-24h">
              ${(Number(market.volume24h) / 1000).toFixed(1)}K
            </div>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Volume</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-volume">
              ${(Number(market.totalVolume) / 1000).toFixed(1)}K
            </div>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Traders</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-traders-count">
              {market.tradersCount}
            </div>
          </Card>

          <Card className="glass-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Closes</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-closing-time">
              {new Date(market.closingTime).toLocaleDateString()}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Price Chart</h3>
            <PriceChart marketId={market.id} yesProbability={Number(market.yesProbability)} />
          </Card>

          <Tabs defaultValue="orderbook" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="orderbook" className="flex-1" data-testid="tab-orderbook">Order Book</TabsTrigger>
              <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
              <TabsTrigger value="info" className="flex-1" data-testid="tab-info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="orderbook">
              <Card className="glass-card p-6">
                <OrderBook marketId={market.id} />
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card className="glass-card p-6">
                <ActivityFeed marketId={market.id} />
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card className="glass-card p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Resolution Details
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Resolution Source: <span className="font-medium capitalize">{market.resolutionSource}</span>
                    </p>
                    {market.resolutionTime && (
                      <p className="text-sm text-muted-foreground">
                        Resolution Time: {new Date(market.resolutionTime).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Creator</h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      {market.creatorAddress.slice(0, 6)}...{market.creatorAddress.slice(-4)}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Market Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Type: <span className="capitalize font-medium">{market.marketType}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Outcomes: {market.outcomes.join(", ")}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <TradingPanel market={market} />
        </div>
      </div>
    </div>
  );
}
