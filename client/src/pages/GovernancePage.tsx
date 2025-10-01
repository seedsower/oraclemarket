import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Vote, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Proposal } from "@shared/schema";

export default function GovernancePage() {
  const { data: proposals } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const activeProposals = proposals?.filter(p => p.status === "active") || [];
  const pastProposals = proposals?.filter(p => p.status !== "active") || [];

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Governance</h1>
        <p className="text-muted-foreground">Vote on proposals and shape the future of OracleMarket</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">Your Voting Power</div>
          <div className="text-3xl font-bold" data-testid="text-voting-power">
            15,000
          </div>
          <p className="text-xs text-muted-foreground mt-2">Based on staked ORACLE</p>
        </Card>

        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">Active Proposals</div>
          <div className="text-3xl font-bold" data-testid="text-active-proposals">
            {activeProposals.length}
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">Your Votes</div>
          <div className="text-3xl font-bold" data-testid="text-user-votes">
            3
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="text-sm text-muted-foreground mb-2">Proposals Passed</div>
          <div className="text-3xl font-bold text-success" data-testid="text-passed-proposals">
            {pastProposals.filter(p => p.status === "passed").length}
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Active Proposals</h2>
        {activeProposals.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <p className="text-muted-foreground">No active proposals</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeProposals.map((proposal) => {
              const totalVotes = Number(proposal.forVotes) + Number(proposal.againstVotes);
              const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 50;
              const againstPercentage = 100 - forPercentage;

              return (
                <Card key={proposal.id} className="glass-card p-6" data-testid={`proposal-${proposal.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize" data-testid={`badge-status-${proposal.id}`}>
                          {proposal.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Ends {formatDistanceToNow(new Date(proposal.endTime), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2" data-testid={`text-title-${proposal.id}`}>
                        {proposal.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4" data-testid={`text-description-${proposal.id}`}>
                        {proposal.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          For: {forPercentage.toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-2 text-destructive">
                          <XCircle className="h-4 w-4" />
                          Against: {againstPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={forPercentage} className="h-2" data-testid={`progress-votes-${proposal.id}`} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">For Votes</div>
                        <div className="font-semibold" data-testid={`text-for-votes-${proposal.id}`}>
                          {Number(proposal.forVotes).toLocaleString()} ORACLE
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Against Votes</div>
                        <div className="font-semibold" data-testid={`text-against-votes-${proposal.id}`}>
                          {Number(proposal.againstVotes).toLocaleString()} ORACLE
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" data-testid={`button-vote-for-${proposal.id}`}>
                        <Vote className="h-4 w-4" />
                        Vote For
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" data-testid={`button-vote-against-${proposal.id}`}>
                        <Vote className="h-4 w-4" />
                        Vote Against
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {pastProposals.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Past Proposals</h2>
          <div className="space-y-4">
            {pastProposals.map((proposal) => (
              <Card key={proposal.id} className="glass-card p-6 opacity-75" data-testid={`past-proposal-${proposal.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={proposal.status === "passed" ? "default" : "destructive"}
                        className="capitalize"
                      >
                        {proposal.status}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">{proposal.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
                  </div>
                  {proposal.executedAt && (
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Executed</div>
                      <div>{new Date(proposal.executedAt).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
