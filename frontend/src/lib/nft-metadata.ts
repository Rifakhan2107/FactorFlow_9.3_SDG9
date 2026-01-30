import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import type { ProjectType } from "@/types";

export interface NFTMetadataInput {
  name: string;
  description: string;
  image: string;
  projectType: ProjectType;
  volumeTCO2e: number;
  verificationProof: string;
  vintage: number;
  location: string;
}

export async function uploadNFTMetadata(
  projectId: string,
  metadata: NFTMetadataInput
): Promise<string> {
  const path = `nft-metadata/${projectId}.json`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, JSON.stringify(metadata), "raw");
  return getDownloadURL(storageRef);
}
