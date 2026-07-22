import { doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const LIMITS: Record<string, number> = {
  analysis: 10,
  pdf: 5,
};

export interface UsageStatus {
  exceeded: boolean;
  limit: number;
  used: number;
}

export async function checkAndConsume(
  uid: string,
  type: "analysis" | "pdf"
): Promise<UsageStatus> {
  const limit = LIMITS[type] ?? 10;
  const ref = doc(db, "users", uid, "usage", type);

  const snap = await getDoc(ref);
  const used = (snap.data()?.count as number) ?? 0;

  if (used >= limit) {
    return { exceeded: true, limit, used };
  }

  await setDoc(ref, { count: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  return { exceeded: false, limit, used: used + 1 };
}

export async function getUsage(
  uid: string,
  type: "analysis" | "pdf"
): Promise<UsageStatus> {
  const limit = LIMITS[type] ?? 10;
  const ref = doc(db, "users", uid, "usage", type);
  const snap = await getDoc(ref);
  const used = (snap.data()?.count as number) ?? 0;
  return { exceeded: used >= limit, limit, used };
}
