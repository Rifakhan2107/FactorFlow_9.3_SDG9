import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  TrendingDown,
  Target,
  ShoppingCart,
  FileText,
  ArrowRight,
  Leaf,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Ban,
} from "lucide-react";
import { getPurchasesByBuyer } from "@/lib/firestore-listings";
import type { MarketplaceListing } from "@/lib/firestore-listings";
import { getCarbonCreditNFTContract } from "@/lib/contract";
import type { BuyerProfile } from "@/types";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { signer } = useWallet();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<(MarketplaceListing & { isRetired?: boolean })[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [retiringId, setRetiringId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getPurchasesByBuyer(user.id)
      .then((list) => {
        setPurchases(list);
        return list;
      })
      .then((list) => {
        if (!signer || list.length === 0) return;
        Promise.all(
          list.map(async (p) => {
            try {
              const contract = getCarbonCreditNFTContract(signer, p.contractAddress);
              const isRetired = await contract.retired(p.tokenId);
              return { ...p, isRetired };
            } catch {
              return { ...p, isRetired: false };
            }
          })
        ).then(setPurchases);
      })
      .finally(() => setLoadingPurchases(false));
  }, [user?.id, signer]);

  const handleRetire = async (purchase: MarketplaceListing & { isRetired?: boolean }) => {
    if (!signer) {
      toast({ title: "Connect wallet", description: "Connect MetaMask to retire credits.", variant: "destructive" });
      return;
    }
    setRetiringId(purchase.id);
    try {
      const contract = getCarbonCreditNFTContract(signer, purchase.contractAddress);
      const tx = await contract.retire(purchase.tokenId);
      await tx.wait();
      setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? { ...p, isRetired: true } : p)));
      toast({ title: "Credit retired", description: "This carbon credit has been marked as used for offset." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Retire failed";
      toast({ title: "Retire failed", description: message, variant: "destructive" });
    } finally {
      setRetiringId(null);
    }
  };

  const buyer = user as BuyerProfile | undefined;
  const baseline = typeof buyer?.emissionsBaseline === "number" ? buyer.emissionsBaseline : 0;
  const target = typeof buyer?.offsetTarget === "number" ? buyer.offsetTarget : 0;
  const totalOffset = purchases.reduce((sum, p) => sum + (p.metadata?.volumeTCO2e ?? 0), 0);
  const netEmissions = Math.max(0, baseline - totalOffset);
  const progressToTarget =
    baseline > target ? Math.min(100, ((baseline - netEmissions) / (baseline - target)) * 100) : 0;
  const remainingOffset = Math.max(0, netEmissions - target);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">
          Welcome back, <span className="text-gradient-primary">{user?.companyName || "Buyer"}</span>
        </h1>
        <p className="text-muted-foreground">
          Track your emissions and offset progress
        </p>
      </div>

      {/* KYC Alert */}
      {user?.kycStatus !== "approved" && (
        <Card variant="glow" className="mb-8 border-warning/50">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-warning shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Complete your KYC verification</p>
              <p className="text-sm text-muted-foreground">
                Upload required documents to unlock full marketplace access
              </p>
            </div>
            <Link to="/buyer/onboarding">
              <Button variant="outline" size="sm" className="gap-2">
                Complete KYC
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <Badge variant="outline">{buyer?.targetYear || "—"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Emissions Baseline</p>
            <p className="font-display text-3xl font-bold">
              {baseline.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">tCO2e</p>
          </CardContent>
        </Card>

        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-success" />
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Total Offset</p>
            <p className="font-display text-3xl font-bold">
              {totalOffset.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">tCO2e</p>
          </CardContent>
        </Card>

        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-accent" />
              </div>
              <Badge variant="verified">Net</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Net Emissions</p>
            <p className="font-display text-3xl font-bold">
              {netEmissions.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">tCO2e</p>
          </CardContent>
        </Card>

        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-warning" />
              </div>
              <Badge variant="warning">Goal</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Remaining to Offset</p>
            <p className="font-display text-3xl font-bold">
              {remainingOffset.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">tCO2e</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress and Actions */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Progress to Goal */}
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Progress to Net-Zero Target
            </CardTitle>
            <CardDescription>
              Your journey from {baseline.toLocaleString()} tCO2e baseline to {target.toLocaleString()} tCO2e target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.round(progressToTarget)}%</span>
              </div>
              <Progress value={progressToTarget} className="h-3" />
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Baseline</p>
                <p className="font-semibold">{baseline.toLocaleString()} tCO2e</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Current Net</p>
                <p className="font-semibold text-primary">{netEmissions.toLocaleString()} tCO2e</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Target</p>
                <p className="font-semibold text-success">{target.toLocaleString()} tCO2e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/marketplace" className="block">
              <Button variant="hero" className="w-full justify-start gap-3">
                <ShoppingCart className="h-4 w-4" />
                Browse Marketplace
              </Button>
            </Link>
            <Link to="/buyer/emissions" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <BarChart3 className="h-4 w-4" />
                Upload Emissions Data
              </Button>
            </Link>
            <Link to="/buyer/compliance" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="h-4 w-4" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Your Carbon Credits (Purchases) */}
      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Carbon Credits</CardTitle>
            <CardDescription>Purchased credits — retire when used for offset</CardDescription>
          </div>
          <Link to="/marketplace">
            <Button variant="ghost" size="sm" className="gap-2">
              Browse Marketplace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loadingPurchases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Leaf className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No purchases yet. Buy carbon credit NFTs from the marketplace.</p>
                  <Link to="/marketplace" className="mt-2 inline-block">
                    <Button variant="hero" size="sm" className="gap-2">
                      Go to Marketplace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Leaf className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{purchase.metadata.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.metadata.volumeTCO2e.toLocaleString()} tCO2e • #{purchase.tokenId}
                          {purchase.soldAt && ` • ${new Date(purchase.soldAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    {purchase.isRetired ? (
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Retired
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleRetire(purchase)}
                        disabled={!!retiringId}
                      >
                        {retiringId === purchase.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Ban className="h-3 w-3" />
                        )}
                        Retire
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
