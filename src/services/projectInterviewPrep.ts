import { getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { documentRef } from "../firebase/firestore";
import { assertCurrentUserCanAccessAdmin } from "./adminSecurity";
import { parseInterviewPrep, type InterviewPrep } from "../utils/projectInterviewPrep";

// Private pages already have server-enforced admin access in firestore.rules.
const reference = () => documentRef("pages", "project-interview-prep");

export async function loadInterviewPrep(): Promise<InterviewPrep | null> {
  await assertCurrentUserCanAccessAdmin();
  const snapshot = await getDoc(reference());
  return snapshot.exists() ? parseInterviewPrep(snapshot.data().interviewPrep) : null;
}

export async function importInterviewPrep(value: unknown): Promise<InterviewPrep> {
  const prep = parseInterviewPrep(value);
  await assertCurrentUserCanAccessAdmin();
  await setDoc(reference(), {
    title: "Project interview preparation",
    visibility: "private",
    status: "draft",
    sections: [],
    interviewPrep: prep,
    updatedAt: serverTimestamp(),
  });
  return prep;
}
