import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Settings } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import type { Market } from "@shared/schema";

interface TradingPanelProps {
  market: Market;
}

export function TradingPanel({ market }: TradingPanelProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">("market");
  const [outcome, setOutcome] = useState("yes");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [slippage, setSlippage] = useState(1);
  const { balance } = useWallet();

  const currentPrice = outcome === "yes" ? Number(market.yesPrice) : Number(market.noPrice);
  const estimatedShares = amount ? Number(amount) / currentPrice : 0;
  const fee = amount ? Number(amount) * 0.02 : 0;
  const total = amount ? Number(amount) + fee : 0;

  const handleTrade = () => {
    console.log("Execute trade:", { side, orderType, outcome, amount, price });
  };

  return (
    <Card className="glass-card p-6 sticky top-20">
      <h3 className="text-lg font-semibold mb-4">Trade</h3>

      <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")} className="mb-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="buy" className="gap-2" data-testid="tab-buy">
            <TrendingUp className="h-4 w-4" />
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="gap-2" data-testid="tab-sell">
            <TrendingDown className="h-4 w-4" />
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        <div>
          <Label>Order Type</Label>
          <Select value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <SelectTrigger data-testid="select-order-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market Order</SelectItem>
              <SelectItem value="limit">Limit Order</SelectItem>
              <SelectItem value="stop">Stop Order</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger data-testid="select-outcome">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <Label>Amount (USD)</Label>
            <span className="text-sm text-muted-foreground">Balance: ${balance.toLocaleString()}</span>
          </div>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="input-amount"
          />
        </div>

        {orderType !== "market" && (
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              data-testid="input-price"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Slippage Tolerance
            </Label>
            <span className="text-sm font-medium">{slippage}%</span>
          </div>
          <Slider
            value={[slippage]}
            onValueChange={(v) => setSlippage(v[0])}
            max={5}
            step={0.5}
            className="mb-2"
            data-testid="slider-slippage"
          />
          <div className="flex gap-2">
            {[0.5, 1, 2].map((val) => (
              <Button
                key={val}
                size="sm"
                variant={slippage === val ? "secondary" : "outline"}
                onClick={() => setSlippage(val)}
                className="flex-1 text-xs"
                data-testid={`button-slippage-${val}`}
              >
                {val}%
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Price</span>
            <span className="font-medium" data-testid="text-current-price">
              ${currentPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Est. Shares</span>
            <span className="font-medium" data-testid="text-estimated-shares">
              {estimatedShares.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fee (2%)</span>
            <span className="font-medium" data-testid="text-fee">
              ${fee.toFixed(2)}
            </span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold" data-testid="text-total">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleTrade}
          disabled={!amount || Number(amount) <= 0}
          data-testid="button-execute-trade"
        >
          {side === "buy" ? "Buy" : "Sell"} {outcome === "yes" ? "Yes" : "No"}
        </Button>
      </div>
    </Card>
  );
}
