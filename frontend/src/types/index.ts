// CarbonX Type Definitions

export type UserRole = "buyer" | "seller";

export type KYCStatus = "pending" | "submitted" | "approved" | "rejected";

export type VerificationStatus = "pending" | "under_review" | "verified" | "rejected";

export type NFTStatus = "draft" | "minting" | "minted" | "listed" | "sold" | "retired";

export type ProjectType = 
  | "reforestation"
  | "renewable_energy"
  | "methane_capture"
  | "ocean_conservation"
  | "soil_carbon"
  | "avoided_deforestation"
  | "clean_cookstoves"
  | "other";

export type Industry = 
  | "manufacturing"
  | "energy"
  | "transportation"
  | "construction"
  | "agriculture"
  | "chemicals"
  | "metals"
  | "textiles"
  | "food_processing"
  | "other";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyName: string;
  country: string;
  industry?: Industry;
  kycStatus: KYCStatus;
  walletAddress?: string;
  emissionsBaseline?: number;
  offsetTarget?: number;
  targetYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerProfile extends User {
  role: "buyer";
  industry: Industry;
  emissionsBaseline?: number; // tCO2e
  offsetTarget?: number; // tCO2e
  targetYear?: number;
  preferredProjectTypes?: ProjectType[];
}

export interface SellerProfile extends User {
  role: "seller";
  portfolioDescription?: string;
  totalCreditsGenerated?: number;
  verificationCertificates?: string[];
}

export interface KYCDocument {
  id: string;
  userId: string;
  type: "business_registration" | "tax_id" | "ownership" | "regulatory" | "other";
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  status: "pending" | "approved" | "rejected";
}

export interface CarbonProject {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  type: ProjectType;
  location: {
    country: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  startDate: Date;
  endDate?: Date;
  volumeTCO2e: number;
  verificationStatus: VerificationStatus;
  governmentApprovalDoc?: string;
  monitoringPlan?: string;
  photos: string[];
  complianceStatus: "compliant" | "non_compliant" | "pending";
  acvaReportId?: string;
  nftId?: string;
  nftContractAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ACVAReport {
  id: string;
  projectId: string;
  generatedAt: Date;
  content: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt?: Date;
  approvedAt?: Date;
  verifierNotes?: string;
}

export interface CarbonNFT {
  id: string;
  projectId: string;
  sellerId: string;
  tokenId?: string;
  contractAddress?: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    projectType: ProjectType;
    volumeTCO2e: number;
    verificationProof: string;
    vintage: number;
    location: string;
  };
  status: NFTStatus;
  priceETH?: number;
  buyerId?: string;
  mintedAt?: Date;
  listedAt?: Date;
  soldAt?: Date;
  retiredAt?: Date;
}

export interface EmissionsData {
  id: string;
  buyerId: string;
  period: string; // e.g., "2024-Q1"
  source: "manual" | "bill_upload" | "api";
  scope1: number; // tCO2e
  scope2: number; // tCO2e
  scope3?: number; // tCO2e
  totalEmissions: number;
  documentation?: string[];
  createdAt: Date;
}

export interface Transaction {
  id: string;
  nftId: string;
  buyerId: string;
  sellerId: string;
  priceETH: number;
  txHash?: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

export interface MarketplaceFilter {
  projectType?: ProjectType[];
  minVolume?: number;
  maxVolume?: number;
  minPrice?: number;
  maxPrice?: number;
  location?: string[];
  verificationStatus?: VerificationStatus[];
}
