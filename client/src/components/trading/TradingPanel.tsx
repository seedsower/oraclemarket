import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Settings, Loader2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useBuyShares, useSellShares, useApproveToken, useOracleTokenBalance } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { parseUnits, formatUnits, decodeEventLog } from "viem";
import type { Market } from "@shared/schema";
import { CONTRACTS, HybridAMMABI } from "@/contracts/config";
import { useReadContract } from "wagmi";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const { address, isConnected, balance } = useWallet();
  const { toast } = useToast();

  const { buy, isConfirming: isBuyConfirming, isSuccess: isBuySuccess, hash: buyHash, receipt: buyReceipt } = useBuyShares();
  const { sell, isConfirming: isSellConfirming, isSuccess: isSellSuccess, hash: sellHash, receipt: sellReceipt } = useSellShares();
  const { approve, isConfirming: isApproving } = useApproveToken();

  // Check allowance for HybridAMM
  const { data: allowance } = useReadContract({
    address: CONTRACTS.OracleToken,
    abi: [
      {
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "allowance",
    args: address ? [address, CONTRACTS.HybridAMM] : undefined,
  });

  const currentPrice = outcome === "yes" ? Number(market.yesPrice) : Number(market.noPrice);
  const estimatedShares = amount ? Number(amount) / currentPrice : 0;
  const fee = amount ? Number(amount) * 0.02 : 0;
  const total = amount ? Number(amount) + fee : 0;

  const isConfirming = isBuyConfirming || isSellConfirming;

  // Calculate required approval amount (use a large number for unlimited approval)
  const requiredAmount = amount ? parseUnits(amount, 18) : BigInt(0);
  const hasApproval = allowance && requiredAmount > 0 ? allowance >= requiredAmount : false;

  const handleApprove = () => {
    const approvalAmount = parseUnits("1000000", 18); // Approve 1M tokens
    approve(CONTRACTS.HybridAMM, approvalAmount);
    toast({
      title: "Approval Submitted",
      description: "Please confirm the approval in your wallet...",
    });
  };

  useEffect(() => {
    if (isBuySuccess && buyHash && buyReceipt) {
      // Parse the SharesPurchased event to get trade details
      let shares = "0";
      let cost = "0";

      for (const log of buyReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: HybridAMMABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'SharesPurchased') {
            shares = formatUnits(decoded.args.shares, 18);
            cost = formatUnits(decoded.args.cost, 18);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      toast({
        title: "Trade Successful!",
        description: `Successfully bought ${parseFloat(shares).toFixed(2)} shares for ${parseFloat(cost).toFixed(2)} ORACLE`,
      });

      // Index trade to backend
      const indexTrade = async () => {
        try {
          // Update market volume/traders
          await apiRequest("PATCH", `/api/markets/${market.id}/trade`, {
            volume: cost,
            traderAddress: address,
          });

          // Create/update position
          await apiRequest("POST", `/api/positions`, {
            userAddress: address,
            marketId: market.id,
            outcome: outcome,
            shares: shares,
            averagePrice: (parseFloat(cost) / parseFloat(shares)).toString(),
            totalCost: cost,
            status: "open",
          });

          queryClient.invalidateQueries({ queryKey: [`/api/markets/${market.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/positions/user/${address}`] });
        } catch (error) {
          console.error("Failed to index trade:", error);
        }
      };
      indexTrade();

      setAmount("");
    }
  }, [isBuySuccess, buyHash, buyReceipt, address, market.id, toast]);

  useEffect(() => {
    if (isSellSuccess && sellHash && sellReceipt) {
      // Parse the SharesSold event to get trade details
      let shares = "0";
      let payout = "0";

      for (const log of sellReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: HybridAMMABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === 'SharesSold') {
            shares = formatUnits(decoded.args.shares, 18);
            payout = formatUnits(decoded.args.payout, 18);
            break;
          }
        } catch (e) {
          // Not the event we're looking for
        }
      }

      toast({
        title: "Trade Successful!",
        description: `Successfully sold ${parseFloat(shares).toFixed(2)} shares for ${parseFloat(payout).toFixed(2)} ORACLE`,
      });

      // Index trade to backend (sell reduces position)
      const indexTrade = async () => {
        try {
          // Update market volume/traders
          await apiRequest("PATCH", `/api/markets/${market.id}/trade`, {
            volume: payout,
            traderAddress: address,
          });

          // Update position (selling reduces shares)
          // In a real app, you'd fetch existing position and update it
          // For now, we'll just invalidate to refetch

          queryClient.invalidateQueries({ queryKey: [`/api/markets/${market.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/positions/user/${address}`] });
        } catch (error) {
          console.error("Failed to index trade:", error);
        }
      };
      indexTrade();

      setAmount("");
    }
  }, [isSellSuccess, sellHash, sellReceipt, address, market.id, toast]);

  const handleTrade = async () => {
    console.log("🔍 TradingPanel handleTrade called. Market data:", {
      id: market.id,
      chainId: market.chainId,
      orderType,
    });

    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // For limit orders, validate price
    if (orderType === "limit" && (!price || Number(price) <= 0)) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid limit price",
        variant: "destructive",
      });
      return;
    }

    // Handle limit orders (off-chain orderbook)
    if (orderType === "limit") {
      try {
        const response = await apiRequest("POST", "/api/orders", {
          userAddress: address,
          marketId: market.id,
          orderType: "limit",
          side,
          outcome,
          price,
          amount,
          status: "open",
        });

        if (response.ok) {
          toast({
            title: "Limit Order Placed",
            description: `Your ${side} order for ${amount} shares at $${price} has been placed.`,
          });
          setAmount("");
          setPrice("");
          queryClient.invalidateQueries({ queryKey: [`/api/orders/market/${market.id}`] });
        }
      } catch (error) {
        console.error("Limit order error:", error);
        toast({
          title: "Order Failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
      return;
    }

    // Handle market orders (on-chain trading)
    if (market.chainId === null || market.chainId === undefined) {
      console.log("❌ Market chainId check failed:", market.chainId);
      toast({
        title: "Market Not On-Chain",
        description: "This market has not been deployed to the blockchain yet.",
        variant: "destructive",
      });
      return;
    }

    if (side === "buy" && !hasApproval) {
      toast({
        title: "Approval Required",
        description: "Please approve the HybridAMM to spend your tokens first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const marketId = BigInt(market.chainId);
      const outcomeIndex = BigInt(outcome === "yes" ? 0 : 1);
      const amountInWei = parseUnits(amount, 18);

      if (side === "buy") {
        buy(marketId, outcomeIndex, amountInWei);
        toast({
          title: "Transaction Submitted",
          description: "Waiting for confirmation...",
        });
      } else {
        sell(marketId, outcomeIndex, amountInWei);
        toast({
          title: "Transaction Submitted",
          description: "Waiting for confirmation...",
        });
      }
    } catch (error) {
      console.error("Trade error:", error);
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
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

        {orderType === "limit" && (
          <div>
            <div className="flex justify-between mb-2">
              <Label>Limit Price (per share)</Label>
              <span className="text-sm text-muted-foreground">Current: ${currentPrice.toFixed(2)}</span>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              min="0.01"
              max="0.99"
              data-testid="input-price"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your order will be placed in the orderbook and filled when market reaches this price
            </p>
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
            <span className="text-muted-foreground">
              {orderType === "limit" ? "Limit Price" : "Current Price"}
            </span>
            <span className="font-medium" data-testid="text-current-price">
              ${orderType === "limit" && price ? Number(price).toFixed(2) : currentPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Est. Shares</span>
            <span className="font-medium" data-testid="text-estimated-shares">
              {orderType === "limit" && price
                ? (Number(amount) / Number(price)).toFixed(2)
                : estimatedShares.toFixed(2)
              }
            </span>
          </div>
          {orderType === "market" && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (2%)</span>
              <span className="font-medium" data-testid="text-fee">
                ${fee.toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold" data-testid="text-total">
              ${orderType === "market" ? total.toFixed(2) : Number(amount || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {side === "buy" && !hasApproval && isConnected && (
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            onClick={handleApprove}
            disabled={isApproving}
            data-testid="button-approve"
          >
            {isApproving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              "Approve ORACLE Tokens"
            )}
          </Button>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleTrade}
          disabled={
            !isConnected ||
            !amount ||
            Number(amount) <= 0 ||
            isConfirming ||
            (orderType === "limit" && (!price || Number(price) <= 0)) ||
            (orderType === "market" && side === "buy" && !hasApproval)
          }
          data-testid="button-execute-trade"
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : orderType === "limit" ? (
            `Place ${side === "buy" ? "Buy" : "Sell"} Order`
          ) : (
            `${side === "buy" ? "Buy" : "Sell"} ${outcome === "yes" ? "Yes" : "No"}`
          )}
        </Button>
      </div>
    </Card>
  );
}
