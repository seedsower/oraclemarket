import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, LogOut, User, DollarSign } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Link } from "wouter";

export function WalletButton() {
  const { isConnected, address, balance, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        variant="outline"
        size="sm"
        className="gap-2"
        data-testid="button-connect-wallet"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-wallet-menu">
          <Wallet className="h-4 w-4" />
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="text-lg font-bold flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {balance.toLocaleString()}
          </div>
        </div>
        <DropdownMenuSeparator />
        <Link href="/portfolio">
          <DropdownMenuItem data-testid="menu-portfolio">
            <User className="mr-2 h-4 w-4" />
            Portfolio
          </DropdownMenuItem>
        </Link>
        <Link href={`/profile/${address}`}>
          <DropdownMenuItem data-testid="menu-profile">
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} data-testid="menu-disconnect">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
