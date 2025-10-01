import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { useWebSocket } from "@/hooks/useWebSocket";
import LandingPage from "@/pages/LandingPage";
import MarketsPage from "@/pages/MarketsPage";
import MarketDetailPage from "@/pages/MarketDetailPage";
import PortfolioPage from "@/pages/PortfolioPage";
import StakingPage from "@/pages/StakingPage";
import GovernancePage from "@/pages/GovernancePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ProfilePage from "@/pages/ProfilePage";
import CreateMarketPage from "@/pages/CreateMarketPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/markets" component={MarketsPage} />
      <Route path="/markets/create" component={CreateMarketPage} />
      <Route path="/markets/:id" component={MarketDetailPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/stake" component={StakingPage} />
      <Route path="/governance" component={GovernancePage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/profile/:address" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useWebSocket();
  
  return (
    <>
      <Navbar />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
