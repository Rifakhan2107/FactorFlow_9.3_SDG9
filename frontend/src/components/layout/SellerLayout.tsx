import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  LayoutDashboard,
  FolderPlus,
  FileText,
  Coins,
  ShoppingCart,
  Settings,
  LogOut,
  Wallet,
  CheckCircle,
  Loader2,
} from "lucide-react";

const sellerNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/seller" },
  { icon: FolderPlus, label: "Projects", path: "/seller/projects" },
  { icon: FileText, label: "Reports", path: "/seller/reports" },
  { icon: Coins, label: "NFT Minting", path: "/seller/nfts" },
  { icon: ShoppingCart, label: "Marketplace", path: "/marketplace" },
  { icon: Settings, label: "Settings", path: "/seller/settings" },
];

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const { account, connect, isConnecting } = useWallet();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/seller") {
      return location.pathname === "/seller";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <Leaf className="h-7 w-7 text-primary" />
            <span className="font-display font-bold text-xl text-gradient-primary">
              CarbonX
            </span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent font-semibold">
                {user?.companyName?.charAt(0) || "S"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user?.companyName || "Seller Org"}
              </p>
              <Badge variant="success" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Seller
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sellerNavItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive(item.path) ? "" : "text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <div className="p-4 border-t border-sidebar-border">
          {account ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="truncate">{account.slice(0, 6)}...{account.slice(-4)}</span>
            </div>
          ) : (
            <Button variant="outline" className="w-full justify-start gap-3" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="min-h-screen bg-gradient-hero">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
