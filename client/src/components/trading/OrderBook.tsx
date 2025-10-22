import { useQuery } from "@tanstack/react-query";
import type { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";

interface OrderBookProps {
  marketId: string;
}

export function OrderBook({ marketId }: OrderBookProps) {
  const { address } = useWallet();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: [`/api/orders/market/${marketId}`],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Sort by price - buy orders descending, sell orders ascending
  const buyOrders = (orders?.filter(o => o.side === "buy" && o.status === "open") || [])
    .sort((a, b) => Number(b.price) - Number(a.price));

  const sellOrders = (orders?.filter(o => o.side === "sell" && o.status === "open") || [])
    .sort((a, b) => Number(a.price) - Number(b.price));

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, {
        status: "cancelled"
      });

      if (response.ok) {
        toast({
          title: "Order Cancelled",
          description: "Your order has been removed from the orderbook.",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/orders/market/${marketId}`] });
      }
    } catch (error) {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading orderbook...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sell Orders (Asks) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-destructive">Sell Orders (Asks)</h4>
          <span className="text-xs text-muted-foreground">{sellOrders.length} orders</span>
        </div>
        {sellOrders.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No sell orders</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to place a sell order!</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs text-muted-foreground mb-2 pb-2 border-b">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Total</div>
              <div></div>
            </div>
            {sellOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-4 text-sm items-center hover:bg-muted/50 rounded p-1 transition-colors"
                data-testid={`order-sell-${order.id}`}
              >
                <div className="text-destructive font-medium">${Number(order.price).toFixed(3)}</div>
                <div className="text-right">{Number(order.amount).toFixed(2)}</div>
                <div className="text-right">${(Number(order.price) * Number(order.amount)).toFixed(2)}</div>
                <div className="text-right">
                  {address?.toLowerCase() === order.userAddress.toLowerCase() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Spread */}
      {buyOrders.length > 0 && sellOrders.length > 0 && (
        <div className="py-3 px-4 bg-muted/30 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Spread</div>
          <div className="text-sm font-medium">
            ${(Number(sellOrders[0].price) - Number(buyOrders[0].price)).toFixed(3)}
          </div>
        </div>
      )}

      {/* Buy Orders (Bids) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-success">Buy Orders (Bids)</h4>
          <span className="text-xs text-muted-foreground">{buyOrders.length} orders</span>
        </div>
        {buyOrders.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No buy orders</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to place a buy order!</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs text-muted-foreground mb-2 pb-2 border-b">
              <div>Price</div>
              <div className="text-right">Shares</div>
              <div className="text-right">Total</div>
              <div></div>
            </div>
            {buyOrders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-4 text-sm items-center hover:bg-muted/50 rounded p-1 transition-colors"
                data-testid={`order-buy-${order.id}`}
              >
                <div className="text-success font-medium">${Number(order.price).toFixed(3)}</div>
                <div className="text-right">{Number(order.amount).toFixed(2)}</div>
                <div className="text-right">${(Number(order.price) * Number(order.amount)).toFixed(2)}</div>
                <div className="text-right">
                  {address?.toLowerCase() === order.userAddress.toLowerCase() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
