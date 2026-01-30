import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CarbonNFT, ProjectType } from "@/types";

const LISTINGS_COLLECTION = "marketplace_listings";

export interface MarketplaceListing {
  id: string;
  tokenId: number;
  projectId: string;
  sellerId: string;
  contractAddress: string;
  priceWei: string;
  priceETH: number;
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
  status: "listed" | "sold";
  listedAt: Date;
  soldAt?: Date;
  buyerId?: string;
}

export async function addListing(listing: Omit<MarketplaceListing, "id" | "listedAt">): Promise<string> {
  const id = `${listing.contractAddress}_${listing.tokenId}`;
  await setDoc(doc(db, LISTINGS_COLLECTION, id), {
    ...listing,
    id,
    status: "listed",
    listedAt: serverTimestamp(),
  });
  return id;
}

export async function markListingSold(
  contractAddress: string,
  tokenId: number,
  buyerId: string
): Promise<void> {
  const id = `${contractAddress}_${tokenId}`;
  await updateDoc(doc(db, LISTINGS_COLLECTION, id), {
    status: "sold",
    buyerId,
    soldAt: serverTimestamp(),
  });
}

export async function getListedNFTs(contractAddress: string): Promise<MarketplaceListing[]> {
  const q = query(
    collection(db, LISTINGS_COLLECTION),
    where("contractAddress", "==", contractAddress),
    where("status", "==", "listed"),
    orderBy("listedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      listedAt: data.listedAt?.toDate?.() ?? data.listedAt,
      soldAt: data.soldAt?.toDate?.() ?? data.soldAt,
    } as MarketplaceListing;
  });
}

export async function getListing(
  contractAddress: string,
  tokenId: number
): Promise<MarketplaceListing | null> {
  const id = `${contractAddress}_${tokenId}`;
  const snap = await getDoc(doc(db, LISTINGS_COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    listedAt: data.listedAt?.toDate?.() ?? data.listedAt,
    soldAt: data.soldAt?.toDate?.() ?? data.soldAt,
  } as MarketplaceListing;
}

export async function getPurchasesByBuyer(buyerId: string): Promise<MarketplaceListing[]> {
  const q = query(
    collection(db, LISTINGS_COLLECTION),
    where("buyerId", "==", buyerId),
    orderBy("soldAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      listedAt: data.listedAt?.toDate?.() ?? data.listedAt,
      soldAt: data.soldAt?.toDate?.() ?? data.soldAt,
    } as MarketplaceListing;
  });
}
