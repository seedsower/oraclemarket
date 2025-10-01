import { useQuery } from "@tanstack/react-query";
import type { Order } from "@shared/schema";

interface OrderBookProps {
  marketId: string;
}

export function OrderBook({ marketId }: OrderBookProps) {
  const { data: orders } = useQuery<Order[]>({
    queryKey: [`/api/orders/market/${marketId}`],
  });

  const buyOrders = orders?.filter(o => o.side === "buy" && o.status === "open") || [];
  const sellOrders = orders?.filter(o => o.side === "sell" && o.status === "open") || [];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-3 text-success">Buy Orders</h4>
        {buyOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buy orders</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-muted-foreground mb-2">
              <div>Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            {buyOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="grid grid-cols-3 text-sm" data-testid={`order-buy-${order.id}`}>
                <div className="text-success">${Number(order.price).toFixed(2)}</div>
                <div className="text-right">{Number(order.amount).toFixed(2)}</div>
                <div className="text-right">${(Number(order.price) * Number(order.amount)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-3 text-destructive">Sell Orders</h4>
        {sellOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sell orders</p>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-muted-foreground mb-2">
              <div>Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
            </div>
            {sellOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="grid grid-cols-3 text-sm" data-testid={`order-sell-${order.id}`}>
                <div className="text-destructive">${Number(order.price).toFixed(2)}</div>
                <div className="text-right">{Number(order.amount).toFixed(2)}</div>
                <div className="text-right">${(Number(order.price) * Number(order.amount)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
