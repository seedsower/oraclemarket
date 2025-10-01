import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Shield, Zap, Globe, BarChart3, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Market } from "@shared/schema";

export default function LandingPage() {
  const { data: markets } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const featuredMarkets = markets?.filter(m => m.isFeatured).slice(0, 3) || [];

  const totalVolume = markets?.reduce((sum, m) => sum + Number(m.totalVolume), 0) || 0;
  const totalMarkets = markets?.length || 0;
  const totalTraders = markets?.reduce((sum, m) => sum + m.tradersCount, 0) || 0;

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-background to-primary/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="container relative px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl" data-testid="text-hero-title">
              The Future of
              <span className="gradient-text"> Prediction Markets</span>
            </h1>
            
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl" data-testid="text-hero-subtitle">
              Trade on real-world events with superior liquidity, transparent resolution, and native tokenomics
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Link href="/markets">
                <Button size="lg" className="gap-2 text-lg" data-testid="button-explore-markets">
                  Explore Markets
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/stake">
                <Button size="lg" variant="outline" className="gap-2 text-lg" data-testid="button-start-staking">
                  Start Staking
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold gradient-text number-ticker" data-testid="text-total-volume">
                  ${(totalVolume / 1000000).toFixed(1)}M
                </div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text number-ticker" data-testid="text-total-markets">
                  {totalMarkets}
                </div>
                <div className="text-sm text-muted-foreground">Active Markets</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text number-ticker" data-testid="text-total-traders">
                  {(totalTraders / 1000).toFixed(1)}K
                </div>
                <div className="text-sm text-muted-foreground">Traders</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-b border-border/40">
        <div className="container px-4">
          <h2 className="text-center text-3xl font-bold mb-12">Why OracleMarket?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Superior Liquidity</h3>
              <p className="text-muted-foreground">
                Hybrid AMM + Order Book design provides deep liquidity and minimal slippage for all market sizes
              </p>
            </Card>

            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Transparent Resolution</h3>
              <p className="text-muted-foreground">
                Multi-layer oracle system with Chainlink, UMA, and community validation ensures fair outcomes
              </p>
            </Card>

            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Chain Support</h3>
              <p className="text-muted-foreground">
                Trade seamlessly across Arbitrum, Base, Optimism, and Solana with unified liquidity
              </p>
            </Card>

            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Trading</h3>
              <p className="text-muted-foreground">
                Professional-grade tools with limit orders, stop-loss, and real-time analytics
              </p>
            </Card>

            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Native Tokenomics</h3>
              <p className="text-muted-foreground">
                Stake ORACLE tokens for reduced fees, governance rights, and protocol revenue sharing
              </p>
            </Card>

            <Card className="glass-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Social Trading</h3>
              <p className="text-muted-foreground">
                Follow top traders, share strategies, and learn from the community leaderboard
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Trending Markets</h2>
            <Link href="/markets">
              <Button variant="ghost" className="gap-2" data-testid="button-view-all-markets">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredMarkets.map((market) => (
              <Link key={market.id} href={`/markets/${market.id}`}>
                <Card className="glass-card p-6 market-card-hover cursor-pointer" data-testid={`card-market-${market.id}`}>
                  <div className="mb-4">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {market.category}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4 line-clamp-2" data-testid={`text-market-question-${market.id}`}>
                    {market.question}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Yes</span>
                      <span className="text-lg font-bold text-success" data-testid={`text-yes-probability-${market.id}`}>
                        {(Number(market.yesProbability) * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Volume</span>
                      <span className="font-medium" data-testid={`text-volume-${market.id}`}>
                        ${(Number(market.totalVolume) / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
