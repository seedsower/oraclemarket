import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { useCreateMarket, useOracleTokenBalance, useApproveToken } from "@/hooks/useContracts";
import { CONTRACTS, MarketFactoryABI } from "@/contracts/config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMarketSchema, type InsertMarket } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2, Loader2, CheckCircle, CalendarIcon } from "lucide-react";
import { useReadContract, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const createMarketFormSchema = insertMarketSchema
  .extend({
    question: z.string().min(10, "Question must be at least 10 characters"),
    closingTime: z.string().refine(
      (val) => {
        const date = new Date(val);
        return date > new Date();
      },
      { message: "Closing time must be in the future" }
    ),
    outcomes: z.array(z.string().min(1, "Outcome cannot be empty")).min(2, "At least 2 outcomes required"),
  })
  .omit({
    resolutionTime: true,
    status: true,
    resolvedOutcome: true,
    isFeatured: true,
    isLive: true,
  });

type CreateMarketForm = Omit<z.infer<typeof createMarketFormSchema>, 'closingTime'> & { closingTime: string };

export default function CreateMarketPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { address, isConnected } = useWallet();
  const { createMarket, isConfirming, isSuccess, hash, receipt } = useCreateMarket();
  const { approve, isConfirming: isApproving, isSuccess: approvalSuccess } = useApproveToken();
  const publicClient = usePublicClient();

  // Debug logging
  console.log("📊 CreateMarketPage state:", { isSuccess, hash, receipt: !!receipt });

  // Token balance and allowance
  const { data: balance } = useOracleTokenBalance(address);
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
    args: address ? [address, CONTRACTS.MarketFactory] : undefined,
  });

  const REQUIRED_TOKENS = BigInt(110) * BigInt(10 ** 18); // 10 creation fee + 100 min liquidity
  const hasEnoughTokens = balance && balance >= REQUIRED_TOKENS;
  const hasApproval = allowance && allowance >= REQUIRED_TOKENS;

  const form = useForm<CreateMarketForm>({
    resolver: zodResolver(createMarketFormSchema),
    defaultValues: {
      question: "",
      description: "",
      category: "Politics" as const,
      marketType: "binary",
      outcomes: ["Yes", "No"],
      creatorAddress: address || "",
      closingTime: "",
      resolutionSource: "manual",
      yesProbability: "0.5",
      yesPrice: "0.5",
      noPrice: "0.5",
    },
  });

  useEffect(() => {
    if (isSuccess && hash) {
      console.log("✅ Market creation transaction confirmed:", hash);
      toast({
        title: "Market Created!",
        description: "Your prediction market has been created on-chain successfully.",
      });
    }
  }, [isSuccess, hash, toast]);

  useEffect(() => {
    console.log("🔍 Indexing useEffect triggered", { isSuccess, hash: !!hash, receipt: !!receipt });

    if (isSuccess && hash && receipt) {
      const formData = form.getValues();
      const trimmedOutcomes = formData.outcomes.map(o => o.trim()).filter(o => o);

      console.log("Indexing market to backend...", formData);
      console.log("Receipt available, logs count:", receipt.logs.length);

      const indexMarket = async () => {
        try {

          // Find MarketCreated event in logs
          let chainId: number | null = null;
          console.log("📝 Checking", receipt.logs.length, "logs. MarketFactory:", CONTRACTS.MarketFactory);

          for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            console.log(`🔍 Log ${i} from:`, log.address, "- Match:", log.address.toLowerCase() === CONTRACTS.MarketFactory.toLowerCase());

            try {
              const decoded = decodeEventLog({
                abi: MarketFactoryABI,
                data: log.data,
                topics: log.topics,
              });

              console.log("✅ Decoded event:", decoded.eventName, decoded.args);

              if (decoded.eventName === 'MarketCreated') {
                chainId = Number(decoded.args.marketId);
                console.log("🎉 Extracted chainId from event:", chainId);
                break;
              }
            } catch (e) {
              // Not the event we're looking for, continue
              console.log("❌ Could not decode:", e instanceof Error ? e.message : 'unknown');
            }
          }

          if (chainId === null) {
            console.warn("⚠️ WARNING: chainId not found in transaction logs!");
          }

          const payload = {
            ...formData,
            chainId,
            outcomes: trimmedOutcomes,
            closingTime: formData.closingTime,
            creatorAddress: address || "",
          };

          console.log("Sending market data to backend with chainId:", chainId, payload);
          const response = await apiRequest("POST", "/api/markets", payload);
          const data = await response.json();

          console.log("Market indexed successfully:", data);
          queryClient.invalidateQueries({ queryKey: ["/api/markets"] });

          toast({
            title: "Market Indexed!",
            description: `Your market has been indexed (Chain ID: ${chainId}).`,
          });

          setLocation(`/markets/${data.id}`);
        } catch (error) {
          console.error("Index error:", error);
          toast({
            title: "Indexing Failed",
            description: "Market was created on-chain but failed to index. Please refresh.",
            variant: "destructive",
          });
        }
      };

      indexMarket();
    }
  }, [isSuccess, hash, receipt, address, form, toast, setLocation]);

  const handleApprove = () => {
    if (!hasEnoughTokens) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least 110 ORACLE tokens (you have ${balance ? Number(balance) / 1e18 : 0}).`,
        variant: "destructive",
      });
      return;
    }

    approve(CONTRACTS.MarketFactory, REQUIRED_TOKENS);
    toast({
      title: "Approval Submitted",
      description: "Please confirm the approval in your wallet...",
    });
  };

  const onSubmit = (data: CreateMarketForm) => {
    console.log("Create market form submitted", { isConnected, address, data });

    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a market.",
        variant: "destructive",
      });
      return;
    }

    if (!hasEnoughTokens) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least 110 ORACLE tokens to create a market.`,
        variant: "destructive",
      });
      return;
    }

    if (!hasApproval) {
      toast({
        title: "Approval Required",
        description: "Please approve the MarketFactory to spend your tokens first.",
        variant: "destructive",
      });
      return;
    }

    const trimmedOutcomes = data.outcomes.map(o => o.trim()).filter(o => o);
    const uniqueOutcomes = new Set(trimmedOutcomes.map(o => o.toLowerCase()));

    if (trimmedOutcomes.some(o => !o)) {
      toast({
        title: "Invalid outcomes",
        description: "All outcomes must have a value.",
        variant: "destructive",
      });
      return;
    }

    if (uniqueOutcomes.size !== trimmedOutcomes.length) {
      toast({
        title: "Invalid outcomes",
        description: "Outcomes must be unique.",
        variant: "destructive",
      });
      return;
    }

    try {
      const endTime = BigInt(Math.floor(new Date(data.closingTime).getTime() / 1000));
      const initialLiquidity = BigInt(100) * BigInt(10 ** 18); // 100 tokens minimum liquidity

      console.log("Creating market with params:", {
        title: data.question,
        description: data.description || "",
        category: data.category,
        endTime: endTime.toString(),
        initialLiquidity: initialLiquidity.toString()
      });

      createMarket(
        data.question,
        data.description || "",
        data.category,
        endTime,
        initialLiquidity
      );

      toast({
        title: "Transaction Submitted",
        description: "Please confirm the transaction in your wallet...",
      });
    } catch (error) {
      console.error("Market creation error:", error);
      toast({
        title: "Market Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const addOutcome = () => {
    const currentOutcomes = form.getValues("outcomes");
    form.setValue("outcomes", [...currentOutcomes, ""]);
  };

  const removeOutcome = (index: number) => {
    const currentOutcomes = form.getValues("outcomes");
    if (currentOutcomes.length > 2) {
      form.setValue("outcomes", currentOutcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const currentOutcomes = form.getValues("outcomes");
    const newOutcomes = [...currentOutcomes];
    newOutcomes[index] = value;
    form.setValue("outcomes", newOutcomes);
  };

  return (
    <div className="container max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Create Market</h1>
        <p className="text-muted-foreground">
          Create a new prediction market for others to trade on
        </p>
      </div>

      {/* Token Balance & Approval Card */}
      {isConnected && (
        <Card className="glass-card p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Oracle Token Balance:</span>
              <span className="text-sm">{balance ? `${Number(balance) / 1e18} ORACLE` : '0 ORACLE'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Required:</span>
              <span className="text-sm">110 ORACLE (10 fee + 100 liquidity)</span>
            </div>
            {hasEnoughTokens && !hasApproval && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full"
                variant="outline"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Tokens'
                )}
              </Button>
            )}
            {hasApproval && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Tokens approved ✓</span>
              </div>
            )}
            {!hasEnoughTokens && (
              <p className="text-sm text-destructive">
                Insufficient balance. You need at least 110 ORACLE tokens.
              </p>
            )}
          </div>
        </Card>
      )}

      <Card className="glass-card p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Will Bitcoin reach $100,000 by December 31, 2025 11:59 PM UTC?"
                      data-testid="input-question"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, unambiguous question that can be objectively resolved. Include specific dates, times, and timezones for AI Oracle to resolve accurately.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide additional context, resolution criteria, and any important details..."
                      className="min-h-[100px]"
                      data-testid="input-description"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Politics">Politics</SelectItem>
                        <SelectItem value="Sports">Sports</SelectItem>
                        <SelectItem value="Crypto">Crypto</SelectItem>
                        <SelectItem value="Economy">Economy</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="closingTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Closing Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="input-closing-time"
                          >
                            {field.value ? (
                              <div className="flex flex-col">
                                <span>{format(new Date(field.value), "PPP p")}</span>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  {Intl.DateTimeFormat().resolvedOptions().timeZone} ({new Date(field.value).toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop()})
                                </span>
                              </div>
                            ) : (
                              <span>Pick a date and time</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Set time to end of day if not specified
                              const newDate = new Date(date);
                              if (!field.value || new Date(field.value).getHours() === 0) {
                                newDate.setHours(23, 59, 59);
                              } else {
                                const oldDate = new Date(field.value);
                                newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
                              }
                              field.onChange(newDate.toISOString());
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={field.value ? format(new Date(field.value), "HH:mm") : "23:59"}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              const currentDate = field.value ? new Date(field.value) : new Date();
                              currentDate.setHours(parseInt(hours), parseInt(minutes), 0);
                              field.onChange(currentDate.toISOString());
                            }}
                            className="w-full"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When trading will end. For AI Oracle resolution, specify timezone in your question (e.g., "by 11 AM UTC")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="outcomes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcomes</FormLabel>
                  <FormControl>
                    <div>
                      <div className="space-y-2">
                        {field.value.map((outcome, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={outcome}
                              onChange={(e) => updateOutcome(index, e.target.value)}
                              placeholder={`Outcome ${index + 1}`}
                              data-testid={`input-outcome-${index}`}
                            />
                            {field.value.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeOutcome(index)}
                                data-testid={`button-remove-outcome-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOutcome}
                        className="mt-2"
                        data-testid="button-add-outcome"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Outcome
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolutionSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-resolution-source">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual Resolution</SelectItem>
                      <SelectItem value="chainlink">Chainlink Oracle</SelectItem>
                      <SelectItem value="uma">UMA Optimistic Oracle</SelectItem>
                      <SelectItem value="api">API Data Source</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How the market outcome will be determined
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isConfirming || !isConnected || !hasApproval || !hasEnoughTokens}
                data-testid="button-create-market"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming on blockchain...
                  </>
                ) : (
                  "Create Market"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/markets")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>

            {!isConnected && (
              <p className="text-sm text-destructive text-center">
                Please connect your wallet to create a market
              </p>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
}
