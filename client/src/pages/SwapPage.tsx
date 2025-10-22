import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownUp, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { useApproveMockUSDC, useMockUSDCBalance, useOracleTokenBalance } from "@/hooks/useContracts";
import { CONTRACTS } from "@/contracts/config";
import { parseUnits, formatEther, parseEther } from "viem";
import { useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

export default function SwapPage() {
  const [swapMode, setSwapMode] = useState<"usdc" | "eth">("usdc");
  const [usdcAmount, setUsdcAmount] = useState<string>("");
  const [ethAmount, setEthAmount] = useState<string>("");
  const { toast } = useToast();
  const { address, isConnected } = useWallet();

  // Balances
  const { data: ethBalance } = useBalance({ address });
  const { data: usdcBalance } = useMockUSDCBalance(address);
  const { data: oracleBalance } = useOracleTokenBalance(address);

  // Contract interactions
  const { writeContract: swapETH, data: ethSwapHash } = useWriteContract();
  const { isLoading: isETHSwapping, isSuccess: isETHSwapSuccess } = useWaitForTransactionReceipt({
    hash: ethSwapHash,
  });

  const { approve: approveUSDC, isConfirming: isUSDCApproving, isSuccess: isUSDCSwapSuccess } = useApproveMockUSDC();

  // Exchange rates
  const usdcExchangeRate = 0.25; // 1 ORACLE = 0.25 USDC
  const ethExchangeRate = 0.0001; // 1 ORACLE = 0.0001 ETH

  const oracleFromUSDC = usdcAmount ? (parseFloat(usdcAmount) / usdcExchangeRate).toFixed(2) : "0.00";
  const oracleFromETH = ethAmount ? (parseFloat(ethAmount) / ethExchangeRate).toFixed(2) : "0.00";

  const minSwapUSDC = 10;
  const maxSwapUSDC = 10000;
  const minSwapETH = 0.01;
  const maxSwapETH = 10;

  useEffect(() => {
    if (isUSDCSwapSuccess) {
      toast({
        title: "USDC Swap Successful!",
        description: `Swapped ${usdcAmount} USDC for ${oracleFromUSDC} ORACLE tokens.`,
      });
      setUsdcAmount("");
    }
  }, [isUSDCSwapSuccess]);

  useEffect(() => {
    if (isETHSwapSuccess) {
      toast({
        title: "ETH Swap Successful!",
        description: `Swapped ${ethAmount} ETH for ${oracleFromETH} ORACLE tokens.`,
      });
      setEthAmount("");
    }
  }, [isETHSwapSuccess]);

  const handleUSDCSwap = async () => {
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

    if (amount < minSwapUSDC) {
      toast({
        title: "Amount too low",
        description: `Minimum swap amount is ${minSwapUSDC} USDC.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > maxSwapUSDC) {
      toast({
        title: "Amount too high",
        description: `Maximum swap amount is ${maxSwapUSDC} USDC.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const amountInWei = parseUnits(usdcAmount, 6);
      approveUSDC(CONTRACTS.Treasury, amountInWei);
      toast({
        title: "Transaction Submitted",
        description: "Swapping USDC for ORACLE tokens...",
      });
    } catch (error) {
      console.error("USDC swap error:", error);
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleETHSwap = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to swap tokens.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(ethAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive",
      });
      return;
    }

    if (amount < minSwapETH) {
      toast({
        title: "Amount too low",
        description: `Minimum swap amount is ${minSwapETH} ETH.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > maxSwapETH) {
      toast({
        title: "Amount too high",
        description: `Maximum swap amount is ${maxSwapETH} ETH.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const amountInWei = parseEther(ethAmount);
      // Call Treasury contract to swap ETH for ORACLE
      swapETH({
        address: CONTRACTS.Treasury,
        abi: [{
          inputs: [],
          name: "swapETHForOracle",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        }],
        functionName: "swapETHForOracle",
        value: amountInWei,
      });
      toast({
        title: "Transaction Submitted",
        description: "Swapping ETH for ORACLE tokens...",
      });
    } catch (error) {
      console.error("ETH swap error:", error);
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleMaxUSDCClick = () => {
    if (usdcBalance) {
      const maxAmount = Math.min(Number(formatEther(usdcBalance)), maxSwapUSDC);
      setUsdcAmount(maxAmount.toString());
    }
  };

  const handleMaxETHClick = () => {
    if (ethBalance) {
      const maxAmount = Math.min(Number(formatEther(ethBalance.value)) - 0.01, maxSwapETH); // Leave 0.01 ETH for gas
      setEthAmount(Math.max(0, maxAmount).toString());
    }
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
              Exchange USDC or ETH for ORACLE tokens instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={swapMode} onValueChange={(v) => setSwapMode(v as "usdc" | "eth")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="usdc">USDC → ORACLE</TabsTrigger>
                <TabsTrigger value="eth">ETH → ORACLE</TabsTrigger>
              </TabsList>

              {/* USDC Swap Tab */}
              <TabsContent value="usdc" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="usdc-amount">You Pay</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Balance: {usdcBalance ? Number(formatEther(usdcBalance)).toFixed(2) : '0.00'} USDC
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMaxUSDCClick}
                        className="h-6 text-xs"
                        data-testid="button-max-usdc"
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="usdc-amount"
                      type="number"
                      placeholder="0.00"
                      value={usdcAmount}
                      onChange={(e) => setUsdcAmount(e.target.value)}
                      className="text-2xl h-16 pr-24"
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
                    Min: ${minSwapUSDC} • Max: ${maxSwapUSDC.toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-muted">
                    <ArrowDownUp className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oracle-amount-usdc">You Receive</Label>
                  <div className="relative">
                    <Input
                      id="oracle-amount-usdc"
                      type="text"
                      value={oracleFromUSDC}
                      readOnly
                      className="text-2xl h-16 pr-32"
                      data-testid="output-oracle-amount-usdc"
                      placeholder="0.00"
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
                      <p className="mb-2">Exchange rate: 1 ORACLE = ${usdcExchangeRate} USDC</p>
                      <p>No fees • Instant settlement</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleUSDCSwap}
                  disabled={!isConnected || isUSDCApproving || !usdcAmount || parseFloat(usdcAmount) <= 0}
                  className="w-full h-12 text-lg"
                  data-testid="button-swap-usdc"
                >
                  {isUSDCApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Swapping...
                    </>
                  ) : !isConnected ? (
                    "Connect Wallet to Swap"
                  ) : (
                    "Swap USDC for ORACLE"
                  )}
                </Button>
              </TabsContent>

              {/* ETH Swap Tab */}
              <TabsContent value="eth" className="space-y-6 mt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="eth-amount">You Pay</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Balance: {ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : '0.0000'} ETH
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMaxETHClick}
                        className="h-6 text-xs"
                        data-testid="button-max-eth"
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="eth-amount"
                      type="number"
                      placeholder="0.00"
                      value={ethAmount}
                      onChange={(e) => setEthAmount(e.target.value)}
                      className="text-2xl h-16 pr-20"
                      min="0"
                      step="0.001"
                      data-testid="input-eth-amount"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="font-semibold">ETH</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Min: {minSwapETH} ETH • Max: {maxSwapETH} ETH
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-muted">
                    <ArrowDownUp className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oracle-amount-eth">You Receive</Label>
                  <div className="relative">
                    <Input
                      id="oracle-amount-eth"
                      type="text"
                      value={oracleFromETH}
                      readOnly
                      className="text-2xl h-16 pr-32"
                      data-testid="output-oracle-amount-eth"
                      placeholder="0.00"
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
                      <p className="mb-2">Exchange rate: 1 ORACLE = {ethExchangeRate} ETH</p>
                      <p>No fees • Instant settlement</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleETHSwap}
                  disabled={!isConnected || isETHSwapping || !ethAmount || parseFloat(ethAmount) <= 0}
                  className="w-full h-12 text-lg"
                  data-testid="button-swap-eth"
                >
                  {isETHSwapping ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Swapping...
                    </>
                  ) : !isConnected ? (
                    "Connect Wallet to Swap"
                  ) : (
                    "Swap ETH for ORACLE"
                  )}
                </Button>
              </TabsContent>
            </Tabs>

            {isConnected && (
              <div className="text-center text-sm text-muted-foreground pt-4">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)} •
                ORACLE Balance: {oracleBalance ? Number(formatEther(oracleBalance)).toFixed(2) : '0.00'}
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
