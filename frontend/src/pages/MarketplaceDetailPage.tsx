import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { getCarbonCreditNFTContract } from "@/lib/contract";
import { getListingById, markListingSold } from "@/lib/firestore-listings";
import type { MarketplaceListing } from "@/lib/firestore-listings";
import {
  ArrowLeft,
  MapPin,
  Leaf,
  Shield,
  Loader2,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { ProjectType } from "@/types";

const projectTypeLabels: Record<ProjectType, string> = {
  reforestation: "Reforestation",
  renewable_energy: "Renewable Energy",
  methane_capture: "Methane Capture",
  ocean_conservation: "Ocean Conservation",
  soil_carbon: "Soil Carbon",
  avoided_deforestation: "Avoided Deforestation",
  clean_cookstoves: "Clean Cookstoves",
  other: "Other",
};

export default function MarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { account, connect, isConnecting, signer } = useWallet();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id === undefined || id === "") {
      setLoading(false);
      return;
    }
    const listingId = decodeURIComponent(id);
    getListingById(listingId)
      .then((l) => setListing(l ?? null))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!listing || listing.status !== "listed") return;
    if (!signer || !account) {
      toast({ title: "Connect wallet", description: "Please connect MetaMask to purchase.", variant: "destructive" });
      connect();
      return;
    }
    setPurchasing(true);
    try {
      const contract = getCarbonCreditNFTContract(signer, listing.contractAddress);
      const priceWei = BigInt(listing.priceWei || "0");
      const tx = await contract.buy(listing.tokenId, { value: priceWei });
      await tx.wait();
      await markListingSold(listing.contractAddress, listing.tokenId, account);
      toast({ title: "Purchase complete!", description: "Carbon credit NFT transferred to your wallet." });
      navigate("/marketplace");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      toast({ title: "Purchase failed", description: message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold mb-4">Listing not found</h1>
        <Link to="/marketplace">
          <Button variant="hero">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const { metadata, priceETH, tokenId } = listing;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        <Card variant="glass" className="overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-72 md:h-full min-h-[300px]">
              <img
                src={metadata.image || "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80"}
                alt={metadata.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <Badge variant="verified" className="absolute top-4 left-4 gap-1">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
              <Badge variant="outline" className="absolute top-4 right-4 bg-background/80">
                #{tokenId}
              </Badge>
            </div>

            <CardContent className="p-8 flex flex-col">
              <CardHeader className="p-0 mb-6">
                <Badge variant="secondary" className="mb-2 w-fit">
                  {projectTypeLabels[metadata.projectType]}
                </Badge>
                <CardTitle className="font-display text-2xl">{metadata.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-2">
                  <MapPin className="h-4 w-4" />
                  {metadata.location}
                </CardDescription>
              </CardHeader>

              <p className="text-muted-foreground flex-1">{metadata.description}</p>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-display font-bold text-lg">
                    {metadata.volumeTCO2e.toLocaleString()} tCO2e
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Vintage</p>
                  <p className="font-display font-bold text-lg">{metadata.vintage}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    {priceETH} ETH
                  </p>
                </div>
                {listing.status === "listed" ? (
                  account ? (
                    <Button
                      variant="hero"
                      size="lg"
                      onClick={handleBuy}
                      disabled={purchasing}
                      className="gap-2"
                    >
                      {purchasing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Leaf className="h-4 w-4" />
                      )}
                      Buy Now
                    </Button>
                  ) : (
                    <Button variant="hero" size="lg" onClick={connect} disabled={isConnecting} className="gap-2">
                      {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      Connect Wallet to Buy
                    </Button>
                  )
                ) : (
                  <Badge variant="secondary">Sold</Badge>
                )}
              </div>
            </CardContent>
          </div>
        </Card>

        <Card variant="glass" className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verification & Compliance
            </CardTitle>
            <CardDescription>
              This carbon credit NFT is backed by verified project data and ACVA verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Verification proof: {metadata.verificationProof || "On-chain verified"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
