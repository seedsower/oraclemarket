import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import type { Trade } from "@shared/schema";

interface ActivityFeedProps {
  marketId: string;
}

export function ActivityFeed({ marketId }: ActivityFeedProps) {
  const { data: trades } = useQuery<Trade[]>({
    queryKey: [`/api/trades/market/${marketId}`],
  });

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No recent trades</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 text-xs text-muted-foreground pb-2 border-b border-border">
        <div>Outcome</div>
        <div className="text-right">Price</div>
        <div className="text-right">Shares</div>
        <div className="text-right">Time</div>
      </div>
      {trades.slice(0, 10).map((trade) => (
        <div key={trade.id} className="grid grid-cols-4 text-sm items-center" data-testid={`trade-${trade.id}`}>
          <div>
            <span className={trade.outcome === "yes" ? "text-success" : "text-destructive"}>
              {trade.outcome === "yes" ? "Yes" : "No"}
            </span>
          </div>
          <div className="text-right font-medium" data-testid={`trade-price-${trade.id}`}>
            ${Number(trade.price).toFixed(2)}
          </div>
          <div className="text-right" data-testid={`trade-shares-${trade.id}`}>
            {Number(trade.shares).toFixed(2)}
          </div>
          <div className="text-right text-xs text-muted-foreground" data-testid={`trade-time-${trade.id}`}>
            {formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  );
}
