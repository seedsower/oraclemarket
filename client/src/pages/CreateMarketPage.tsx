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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { useCreateMarket } from "@/hooks/useContracts";
import { CONTRACTS } from "@/contracts/config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMarketSchema, type InsertMarket } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2, Loader2 } from "lucide-react";

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
  const { createMarket, isConfirming, isSuccess, hash } = useCreateMarket();

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
      console.log("Market creation transaction confirmed:", hash);
      toast({
        title: "Market Created!",
        description: "Your prediction market has been created on-chain successfully.",
      });
    }
  }, [isSuccess, hash, toast]);

  useEffect(() => {
    if (isSuccess && hash) {
      const formData = form.getValues();
      const trimmedOutcomes = formData.outcomes.map(o => o.trim()).filter(o => o);
      
      console.log("Indexing market to backend...", formData);
      
      const indexMarket = async () => {
        try {
          const payload: InsertMarket = {
            ...formData,
            outcomes: trimmedOutcomes,
            closingTime: new Date(formData.closingTime),
            creatorAddress: address || "",
          };
          
          console.log("Sending market data to backend:", payload);
          const response = await apiRequest("POST", "/api/markets", payload);
          const data = await response.json();
          
          console.log("Market indexed successfully:", data);
          queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
          
          toast({
            title: "Market Indexed!",
            description: "Your market has been indexed in the database.",
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
  }, [isSuccess, hash, address, form, toast, setLocation]);

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
      const closingTimestamp = BigInt(Math.floor(new Date(data.closingTime).getTime() / 1000));
      const resolutionSourceMap: Record<string, number> = {
        manual: 0,
        chainlink: 1,
        uma: 2,
        api: 3,
      };
      const resolutionSource = data.resolutionSource || "manual";
      const resolutionSourceValue = BigInt(resolutionSourceMap[resolutionSource] || 0);
      
      console.log("Creating market with params:", {
        question: data.question,
        outcomes: trimmedOutcomes,
        closingTimestamp: closingTimestamp.toString(),
        resolutionSourceValue: resolutionSourceValue.toString(),
        settlementToken: CONTRACTS.MockUSDC
      });
      
      createMarket(
        data.question,
        trimmedOutcomes,
        closingTimestamp,
        resolutionSourceValue,
        CONTRACTS.MockUSDC
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
                      placeholder="Will Bitcoin reach $100,000 by end of 2025?"
                      data-testid="input-question"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, unambiguous question that can be objectively resolved
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
                  <FormItem>
                    <FormLabel>Closing Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        data-testid="input-closing-time"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      When trading will end
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
                disabled={isConfirming || !isConnected}
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
