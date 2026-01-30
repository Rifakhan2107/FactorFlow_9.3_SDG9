import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { getCarbonCreditNFTContract, getCarbonCreditNFTFactory } from "@/lib/contract";
import {
  Coins,
  Wallet,
  CheckCircle,
  ArrowRight,
  Loader2,
  Leaf,
  Shield,
  Sparkles,
} from "lucide-react";
import { getVerifiedProjects, saveProjectContract, updateProjectNftId } from "@/lib/firestore-projects";
import { addListing } from "@/lib/firestore-listings";
import { uploadNFTMetadata } from "@/lib/nft-metadata";
import type { CarbonProject } from "@/types";
import type { ProjectType } from "@/types";
import { ethers } from "ethers";

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

export default function NFTMinting() {
  const { user } = useAuth();
  const { account, connect, isConnecting, error: walletError, signer } = useWallet();
  const { toast } = useToast();
  const [verifiedProjects, setVerifiedProjects] = useState<CarbonProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [price, setPrice] = useState("");
  const [listingProjectId, setListingProjectId] = useState<string | null>(null);

  const walletConnected = !!account;

  useEffect(() => {
    if (!user?.id || user.role !== "seller") return;
    getVerifiedProjects(user.id)
      .then(setVerifiedProjects)
      .catch(() => setVerifiedProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [user?.id, user?.role]);

  const handleMint = async (project: CarbonProject) => {
    if (!signer || !account) {
      toast({ title: "Connect wallet", description: "Please connect MetaMask first.", variant: "destructive" });
      return;
    }
    setIsMinting(true);
    setSelectedProject(project.id);
    try {
      let contractAddress = project.nftContractAddress;
      if (!contractAddress) {
        toast({ title: "Deploying contract...", description: "Creating NFT contract for this project." });
        const factory = getCarbonCreditNFTFactory(signer);
        const contractInstance = await factory.deploy(account);
        await contractInstance.waitForDeployment();
        contractAddress = await contractInstance.getAddress();
        await saveProjectContract(project.id, contractAddress);
        setVerifiedProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, nftContractAddress: contractAddress } : p))
        );
      }
      const contract = getCarbonCreditNFTContract(signer, contractAddress);
      const imageUrl = project.photos?.[0] || "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80";
      const vintage = project.startDate ? new Date(project.startDate).getFullYear() : new Date().getFullYear();
      const location = `${project.location.region}, ${project.location.country}`;
      const verificationProof = ethers.keccak256(ethers.toUtf8Bytes(`${project.id}-${project.volumeTCO2e}`));
      const tokenURI = await uploadNFTMetadata(project.id, {
        name: project.name,
        description: project.description,
        image: imageUrl,
        projectType: project.type,
        volumeTCO2e: project.volumeTCO2e,
        verificationProof,
        vintage,
        location,
      });
      const verificationProofHash = ethers.keccak256(ethers.toUtf8Bytes(`${project.id}-${project.volumeTCO2e}-verified`));
      const tx = await contract.mint(
        account,
        tokenURI,
        project.id,
        project.volumeTCO2e,
        verificationProofHash
      );
      const receipt = await tx.wait();
      const transferLog = receipt?.logs?.find(
        (l: { address: string }) => l.address?.toLowerCase() === contractAddress?.toLowerCase()
      );
      const tokenId = transferLog?.topics?.[3] ? Number(ethers.toBigInt(transferLog.topics[3])) : undefined;
      if (tokenId !== undefined) {
        await updateProjectNftId(project.id, tokenId, contractAddress!);
        toast({ title: "NFT Minted!", description: `Token ID: ${tokenId}. You can now list it.` });
        setVerifiedProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, nftId: String(tokenId), nftContractAddress: contractAddress } : p))
        );
      } else {
        toast({ title: "NFT Minted!", description: "Transaction confirmed. Refresh to see token ID." });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mint failed";
      toast({ title: "Mint failed", description: message, variant: "destructive" });
    } finally {
      setIsMinting(false);
      setSelectedProject(null);
    }
  };

  const handleList = async (project: CarbonProject) => {
    const tokenId = project.nftId ? parseInt(project.nftId, 10) : undefined;
    if (tokenId === undefined || isNaN(tokenId)) {
      toast({ title: "No NFT", description: "Mint this project first.", variant: "destructive" });
      return;
    }
    const contractAddress = project.nftContractAddress;
    if (!contractAddress) {
      toast({ title: "No contract", description: "Project has no NFT contract. Mint first.", variant: "destructive" });
      return;
    }
    const priceEth = parseFloat(price);
    if (!price || isNaN(priceEth) || priceEth <= 0) {
      toast({ title: "Invalid price", description: "Enter a price in ETH.", variant: "destructive" });
      return;
    }
    if (!signer || !account) {
      toast({ title: "Connect wallet", description: "Please connect MetaMask first.", variant: "destructive" });
      return;
    }
    setIsListing(true);
    setListingProjectId(project.id);
    try {
      const contract = getCarbonCreditNFTContract(signer, contractAddress);
      const priceWei = ethers.parseEther(price);
      const tx = await contract.list(tokenId, priceWei);
      await tx.wait();
      await addListing({
        tokenId,
        projectId: project.id,
        sellerId: project.sellerId,
        contractAddress,
        priceWei: priceWei.toString(),
        priceETH: priceEth,
        metadata: {
          name: project.name,
          description: project.description,
          image: project.photos?.[0] || "",
          projectType: project.type,
          volumeTCO2e: project.volumeTCO2e,
          verificationProof: "0x",
          vintage: project.startDate ? new Date(project.startDate).getFullYear() : new Date().getFullYear(),
          location: `${project.location.region}, ${project.location.country}`,
        },
        status: "listed",
      });
      toast({ title: "Listed!", description: `Listed for ${price} ETH on the marketplace.` });
      setPrice("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Listing failed";
      toast({ title: "Listing failed", description: message, variant: "destructive" });
    } finally {
      setIsListing(false);
      setListingProjectId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">
          NFT <span className="text-gradient-primary">Minting</span>
        </h1>
        <p className="text-muted-foreground">
          Mint verified carbon credits as NFTs on the blockchain
        </p>
      </div>

      <Card variant="glow" className="mb-8">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {walletConnected ? "Wallet Connected" : "Connect Your Wallet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {walletConnected
                  ? `${account?.slice(0, 6)}...${account?.slice(-4)} (Local)`
                  : "Connect MetaMask to mint and list NFTs"}
              </p>
              {walletError && (
                <p className="text-sm text-destructive mt-1">{walletError}</p>
              )}
            </div>
          </div>
          {walletConnected ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Button variant="hero" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Wallet"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/20 mx-auto flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Verified Only</h3>
            <p className="text-sm text-muted-foreground">
              Only ACVA-verified projects can be minted as NFTs
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-accent/20 mx-auto flex items-center justify-center mb-4">
              <Coins className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">ERC-721 Standard</h3>
            <p className="text-sm text-muted-foreground">
              Each credit becomes a unique, tradeable NFT
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-success/20 mx-auto flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-2">Auto-Listed</h3>
            <p className="text-sm text-muted-foreground">
              Set your price and list directly on the marketplace
            </p>
          </CardContent>
        </Card>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle>Verified Projects Ready for Minting</CardTitle>
          <CardDescription>
            Projects with verified status can be minted as NFTs. Deploy the contract and set VITE_CARBON_CREDIT_NFT_ADDRESS to use the blockchain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProjects ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {verifiedProjects.map((project) => {
                const nftMinted = !!project.nftId;
                const tokenId = project.nftId ? parseInt(project.nftId, 10) : null;
                return (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Leaf className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.volumeTCO2e.toLocaleString()} tCO2e •{" "}
                            {projectTypeLabels[project.type]} • Verified
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>

                    {nftMinted ? (
                      <div className="flex items-center justify-between p-3 rounded bg-success/10 flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-medium">NFT Minted</p>
                          <p className="text-xs text-muted-foreground">Token ID: #{tokenId}</p>
                        </div>
                        {project.nftContractAddress ? (
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`price-${project.id}`} className="text-sm">
                                Price:
                              </Label>
                              <Input
                                id={`price-${project.id}`}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="w-24 h-8"
                                value={listingProjectId === project.id ? price : ""}
                                onChange={(e) => setPrice(e.target.value)}
                              />
                              <span className="text-sm">ETH</span>
                            </div>
                            <Button
                              variant="hero"
                              size="sm"
                              onClick={() => handleList(project)}
                              disabled={isListing}
                            >
                              {isListing && listingProjectId === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "List"
                              )}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Button
                        variant="hero"
                        className="w-full gap-2"
                        disabled={!walletConnected || !signer || isMinting}
                        onClick={() => handleMint(project)}
                      >
                        {isMinting && selectedProject === project.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Minting...
                          </>
                        ) : (
                          <>
                            <Coins className="h-4 w-4" />
                            Mint NFT
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}

              {verifiedProjects.length === 0 && (
                <div className="text-center py-12">
                  <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No verified projects</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete project creation and ACVA verification to mint NFTs. Projects appear here once status is &quot;verified&quot; (for demo you can set verificationStatus to verified in Firestore).
                  </p>
                  <Link to="/seller/projects/new">
                    <Button variant="hero" className="gap-2">
                      Create Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
