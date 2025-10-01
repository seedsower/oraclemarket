import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertMarketSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

const createMarketFormSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  description: z.string().optional(),
  category: z.enum(["Politics", "Sports", "Crypto", "Economy", "Entertainment"]),
  marketType: z.string().default("binary"),
  outcomes: z.array(z.string()),
  creatorAddress: z.string(),
  closingTime: z.string().min(1, "Closing time is required"),
  resolutionSource: z.string().min(1, "Resolution source is required"),
  yesProbability: z.string().default("0.5"),
  yesPrice: z.string().default("0.5"),
  noPrice: z.string().default("0.5"),
});

type CreateMarketForm = z.infer<typeof createMarketFormSchema>;

export default function CreateMarketPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { address } = useWallet();
  const [customOutcomes, setCustomOutcomes] = useState<string[]>(["Yes", "No"]);

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

  const createMarketMutation = useMutation({
    mutationFn: async (data: CreateMarketForm) => {
      const response = await apiRequest("POST", "/api/markets", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({
        title: "Market created!",
        description: "Your prediction market has been created successfully.",
      });
      setLocation(`/markets/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateMarketForm) => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a market.",
        variant: "destructive",
      });
      return;
    }

    createMarketMutation.mutate({
      ...data,
      creatorAddress: address,
      outcomes: customOutcomes,
    });
  };

  const addOutcome = () => {
    setCustomOutcomes([...customOutcomes, ""]);
  };

  const removeOutcome = (index: number) => {
    if (customOutcomes.length > 2) {
      setCustomOutcomes(customOutcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...customOutcomes];
    newOutcomes[index] = value;
    setCustomOutcomes(newOutcomes);
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
                      defaultValue={field.value}
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

            <div>
              <Label className="mb-3 block">Outcomes</Label>
              <div className="space-y-2">
                {customOutcomes.map((outcome, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => updateOutcome(index, e.target.value)}
                      placeholder={`Outcome ${index + 1}`}
                      data-testid={`input-outcome-${index}`}
                    />
                    {customOutcomes.length > 2 && (
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

            <FormField
              control={form.control}
              name="resolutionSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Source</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
                disabled={createMarketMutation.isPending || !address}
                data-testid="button-create-market"
              >
                {createMarketMutation.isPending ? "Creating..." : "Create Market"}
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

            {!address && (
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
