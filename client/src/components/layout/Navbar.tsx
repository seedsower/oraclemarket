import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingUp, Vote, Trophy, User, Coins, ArrowLeftRight } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";

export function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/markets", label: "Markets", icon: TrendingUp },
    { href: "/portfolio", label: "Portfolio", icon: User },
    { href: "/swap", label: "Swap", icon: ArrowLeftRight },
    { href: "/stake", label: "Stake", icon: Coins },
    { href: "/governance", label: "Governance", icon: Vote },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">OracleMarket</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href || location.startsWith(link.href + "/");
              
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid={`link-${link.label.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
