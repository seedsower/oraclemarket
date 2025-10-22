import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, Clock } from "lucide-react";
import type { Market } from "@shared/schema";

export default function MarketsPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("volume");
  const [statusFilter, setStatusFilter] = useState<"active" | "closed" | "all">("active");

  const { data: markets, isLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const categories = ["all", "Politics", "Sports", "Crypto", "Economy", "Entertainment"];

  const filteredMarkets = markets?.filter((market) => {
    // Filter by status (active/closed/resolved)
    if (statusFilter === "active" && (market.status === "closed" || market.status === "resolved")) return false;
    if (statusFilter === "closed" && market.status !== "closed" && market.status !== "resolved") return false;

    if (category !== "all" && market.category !== category) return false;
    if (search && !market.question.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  const sortedMarkets = filteredMarkets.slice().sort((a, b) => {
    if (sortBy === "volume") return Number(b.totalVolume) - Number(a.totalVolume);
    if (sortBy === "liquidity") return Number(b.liquidity) - Number(a.liquidity);
    if (sortBy === "closing") return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
    return 0;
  });

  return (
    <div className="container px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Markets</h1>
          <p className="text-muted-foreground">Trade on real-world events with transparent resolution</p>
        </div>
        <Link href="/markets/create">
          <Button data-testid="button-create-market">
            Create Market
          </Button>
        </Link>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "active" | "closed" | "all")} className="mb-6">
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="active" data-testid="tab-active-markets">
            Active
          </TabsTrigger>
          <TabsTrigger value="closed" data-testid="tab-closed-markets">
            Closed
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-markets">
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-markets"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[180px]" data-testid="select-sort-by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volume">Volume</SelectItem>
            <SelectItem value="liquidity">Liquidity</SelectItem>
            <SelectItem value="closing">Closing Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={category} onValueChange={setCategory} className="mb-8">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="capitalize"
              data-testid={`tab-${cat.toLowerCase()}`}
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-full" />
                <div className="h-6 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : sortedMarkets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No markets found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedMarkets.map((market) => (
            <Link key={market.id} href={`/markets/${market.id}`}>
              <Card className="glass-card p-6 market-card-hover cursor-pointer" data-testid={`card-market-${market.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {market.category}
                  </span>
                  <div className="flex gap-2">
                    {market.status === "resolved" && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                        Resolved
                      </span>
                    )}
                    {market.status === "closed" && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500">
                        Closed
                      </span>
                    )}
                    {market.isFeatured && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-4 line-clamp-2" data-testid={`text-question-${market.id}`}>
                  {market.question}
                </h3>

                <div className="space-y-3">
                  {market.status === "resolved" && market.resolvedOutcome !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Outcome</span>
                      <span className="text-xl font-bold text-green-500" data-testid={`text-outcome-${market.id}`}>
                        {market.resolvedOutcome === 0 ? "YES" : "NO"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Probability</span>
                      <span className="text-xl font-bold text-success" data-testid={`text-probability-${market.id}`}>
                        {(Number(market.yesProbability) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Volume
                      </div>
                      <div className="font-medium" data-testid={`text-volume-${market.id}`}>
                        ${(Number(market.totalVolume) / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closes
                      </div>
                      <div className="font-medium" data-testid={`text-closes-${market.id}`}>
                        {new Date(market.closingTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" variant="outline" data-testid={`button-buy-yes-${market.id}`}>
                      Buy Yes
                    </Button>
                    <Button size="sm" className="flex-1" variant="outline" data-testid={`button-buy-no-${market.id}`}>
                      Buy No
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
