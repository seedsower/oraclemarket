import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowDownUp, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { useApproveMockUSDC, useMockUSDCBalance } from "@/hooks/useContracts";
import { CONTRACTS } from "@/contracts/config";
import { parseUnits } from "viem";

export default function SwapPage() {
  const [usdcAmount, setUsdcAmount] = useState<string>("");
  const { toast } = useToast();
  const { address, isConnected } = useWallet();

  const { approve, isConfirming, isSuccess } = useApproveMockUSDC();

  const exchangeRate = 0.25;
  const oracleAmount = usdcAmount ? (parseFloat(usdcAmount) / exchangeRate).toFixed(2) : "0.00";
  const minSwap = 10;
  const maxSwap = 10000;

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Swap Successful!",
        description: `Swapped ${usdcAmount} USDC for ${oracleAmount} ORACLE tokens.`,
      });
      setUsdcAmount("");
    }
  }, [isSuccess]);

  const handleSwap = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to swap tokens.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(usdcAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive",
      });
      return;
    }

    if (amount < minSwap) {
      toast({
        title: "Amount too low",
        description: `Minimum swap amount is ${minSwap} USDC.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > maxSwap) {
      toast({
        title: "Amount too high",
        description: `Maximum swap amount is ${maxSwap} USDC.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const amountInWei = parseUnits(usdcAmount, 6);
      approve(CONTRACTS.HybridAMM, amountInWei);
      toast({
        title: "Transaction Submitted",
        description: "Approving USDC for swap...",
      });
    } catch (error) {
      console.error("Swap error:", error);
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleMaxClick = () => {
    setUsdcAmount("10000");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12">
      <div className="container max-w-2xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 gradient-text">Token Swap</h1>
          <p className="text-muted-foreground">
            Exchange USDC for ORACLE tokens at the best rate
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Swap Tokens</CardTitle>
            <CardDescription>
              Current exchange rate: 1 ORACLE = ${exchangeRate} USDC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="usdc-amount">You Pay</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  className="h-6 text-xs"
                  data-testid="button-max"
                >
                  MAX
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="usdc-amount"
                  type="number"
                  placeholder="0.00"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className="text-2xl h-16 pr-20"
                  min="0"
                  step="0.01"
                  data-testid="input-usdc-amount"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  <span className="font-semibold">USDC</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Min: ${minSwap} • Max: ${maxSwap.toLocaleString()}
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-muted">
                <ArrowDownUp className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oracle-amount">You Receive</Label>
              <div className="relative">
                <Input
                  id="oracle-amount"
                  type="text"
                  value={oracleAmount}
                  readOnly
                  className="text-2xl h-16 pr-32 bg-muted/50"
                  data-testid="output-oracle-amount"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-white text-xs font-bold">O</span>
                  </div>
                  <span className="font-semibold">ORACLE</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Exchange rate: 1 ORACLE = ${exchangeRate} USDC</p>
                  <p>No fees • Instant settlement • Price guaranteed for 30 seconds</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSwap}
              disabled={!isConnected || isConfirming || !usdcAmount || parseFloat(usdcAmount) <= 0}
              className="w-full h-12 text-lg"
              data-testid="button-swap"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Swapping...
                </>
              ) : !isConnected ? (
                "Connect Wallet to Swap"
              ) : (
                "Swap Tokens"
              )}
            </Button>

            {isConnected && (
              <div className="text-center text-sm text-muted-foreground">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$2.4M</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Liquidity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$8.7M</p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Price Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">~0.01%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
