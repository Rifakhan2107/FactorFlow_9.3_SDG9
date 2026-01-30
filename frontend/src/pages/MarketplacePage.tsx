import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Filter,
  MapPin,
  Leaf,
  Zap,
  TreePine,
  Waves,
  Flame,
  Shield,
  ExternalLink,
} from "lucide-react";
import { ProjectType } from "@/types";
import { getListedNFTsAll } from "@/lib/firestore-listings";
import type { MarketplaceListing } from "@/lib/firestore-listings";

const projectTypeIcons: Record<ProjectType, typeof TreePine> = {
  reforestation: TreePine,
  renewable_energy: Zap,
  methane_capture: Flame,
  ocean_conservation: Waves,
  soil_carbon: Leaf,
  avoided_deforestation: Shield,
  clean_cookstoves: Flame,
  other: Leaf,
};

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

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState([0, 2]);
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    getListedNFTsAll()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoadingListings(false));
  }, []);

  const displayListings = listings;

  const filteredNFTs = displayListings.filter((nft) => {
    if (nft.status !== "listed") return false;
    const matchesSearch =
      nft.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.metadata.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      projectTypeFilter === "all" || nft.metadata.projectType === projectTypeFilter;
    const matchesPrice =
      nft.priceETH >= priceRange[0] && nft.priceETH <= priceRange[1];
    return matchesSearch && matchesType && matchesPrice;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Carbon Credit <span className="text-gradient-primary">Marketplace</span>
          </h1>
          <p className="text-muted-foreground">
            Browse and purchase verified carbon credit NFTs from trusted projects worldwide
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name or location..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Project Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(projectTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <Card className="p-6 mb-8 animate-fade-in">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Price Range (ETH)
                </label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>{priceRange[0]} ETH</span>
                    <span>{priceRange[1]} ETH</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {loadingListings ? "Loading..." : `Showing ${filteredNFTs.length} of ${displayListings.length} carbon credits`}
        </p>

        {/* NFT Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNFTs.map((nft, index) => {
            const TypeIcon = projectTypeIcons[nft.metadata.projectType];
            const imageUrl = nft.metadata.image || "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80";
            return (
              <Card
                key={nft.id}
                variant="interactive"
                className={`overflow-hidden animate-fade-up stagger-${(index % 5) + 1}`}
              >
                <div className="relative h-48">
                  <img
                    src={imageUrl}
                    alt={nft.metadata.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <Badge variant="verified" className="absolute top-3 left-3">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                  <Badge variant="outline" className="absolute top-3 right-3 bg-background/80">
                    #{nft.tokenId}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg truncate">
                        {nft.metadata.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {nft.metadata.location}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="font-semibold">
                        {nft.metadata.volumeTCO2e.toLocaleString()} tCO2e
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-display font-bold text-lg text-primary">
                        {nft.priceETH} ETH
                      </p>
                    </div>
                  </div>

                  <Badge variant="secondary" className="text-xs">
                    {projectTypeLabels[nft.metadata.projectType]}
                  </Badge>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Link to={`/marketplace/${encodeURIComponent(nft.id)}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2">
                      View Details
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Link to={`/marketplace/${encodeURIComponent(nft.id)}`} className="flex-1">
                    <Button variant="hero" className="w-full">
                      Buy Now
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {filteredNFTs.length === 0 && (
          <div className="text-center py-16">
            <Leaf className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">
              No credits found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
