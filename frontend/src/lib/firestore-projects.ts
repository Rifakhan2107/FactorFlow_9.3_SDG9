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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { CarbonProject, ProjectType, VerificationStatus } from "@/types";

const PROJECTS_COLLECTION = "projects";
const REPORTS_COLLECTION = "acvaReports";

export interface ProjectCreateInput {
  sellerId: string;
  name: string;
  description: string;
  type: ProjectType;
  location: { country: string; region: string };
  startDate: Date;
  volumeTCO2e: number;
  monitoringPlan: string;
  governmentApprovalDocUrl?: string;
  complianceDocUrl?: string;
  photoUrls: string[];
  complianceStatus: "compliant" | "non_compliant" | "pending";
}

export async function uploadProjectFile(
  projectId: string,
  folder: string,
  file: File
): Promise<string> {
  const path = `projects/${projectId}/${folder}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createProject(
  input: ProjectCreateInput,
  projectId?: string
): Promise<string> {
  const id = projectId || doc(collection(db, PROJECTS_COLLECTION)).id;
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  await setDoc(docRef, {
    id,
    sellerId: input.sellerId,
    name: input.name,
    description: input.description,
    type: input.type,
    location: {
      country: input.location.country,
      region: input.location.region,
    },
    startDate: input.startDate,
    volumeTCO2e: input.volumeTCO2e,
    verificationStatus: "pending",
    governmentApprovalDoc: input.governmentApprovalDocUrl ?? null,
    monitoringPlan: input.monitoringPlan,
    photos: input.photoUrls,
    complianceStatus: input.complianceStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function getProject(projectId: string): Promise<CarbonProject | null> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    startDate: data.startDate?.toDate?.() ?? data.startDate,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
  } as CarbonProject;
}

export async function getProjectsBySeller(sellerId: string): Promise<CarbonProject[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where("sellerId", "==", sellerId),
    orderBy("updatedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      startDate: data.startDate?.toDate?.() ?? data.startDate,
      endDate: data.endDate?.toDate?.() ?? data.endDate,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    } as CarbonProject;
  });
}

export async function getVerifiedProjects(sellerId: string): Promise<CarbonProject[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where("sellerId", "==", sellerId),
    where("verificationStatus", "==", "verified")
  );
  const snap = await getDocs(q);
  const projects = snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      startDate: data.startDate?.toDate?.() ?? data.startDate,
      endDate: data.endDate?.toDate?.() ?? data.endDate,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
    } as CarbonProject;
  });
  return projects.sort((a, b) => {
    const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
    const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
    return bTime - aTime;
  });
}

export async function updateProjectVerification(
  projectId: string,
  status: VerificationStatus,
  acvaReportId?: string
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    verificationStatus: status,
    ...(acvaReportId ? { acvaReportId } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function saveACVAReport(
  projectId: string,
  content: string,
  status: "draft" | "submitted" | "approved" | "rejected"
): Promise<string> {
  const reportId = doc(collection(db, REPORTS_COLLECTION)).id;
  await setDoc(doc(db, REPORTS_COLLECTION, reportId), {
    id: reportId,
    projectId,
    content,
    status,
    generatedAt: serverTimestamp(),
    submittedAt: status === "submitted" ? serverTimestamp() : null,
  });
  return reportId;
}

export async function updateProjectWithReport(
  projectId: string,
  reportId: string,
  verificationStatus: VerificationStatus
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    acvaReportId: reportId,
    verificationStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProjectNftId(
  projectId: string,
  tokenId: number,
  contractAddress: string
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    nftId: String(tokenId),
    nftContractAddress: contractAddress,
    updatedAt: serverTimestamp(),
  });
}

export async function saveProjectContract(
  projectId: string,
  contractAddress: string
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    nftContractAddress: contractAddress,
    updatedAt: serverTimestamp(),
  });
}
