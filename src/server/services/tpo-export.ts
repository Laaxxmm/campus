import { toCsv } from "@/lib/csv";
import { companyName } from "@/lib/companies";
import type { StudentRow } from "./tpo";

export const STUDENT_CSV_HEADERS = ["Name", "Email", "Roll no", "Batch", "Target company", "Streak (days)", "XP", "Drills (7 days)", "Accuracy 30d (%)", "Readiness", "Last active (IST)", "At risk", "Reason"];

export function studentsCsv(rows: StudentRow[]) {
  const ist = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "");
  return toCsv(rows, [
    { header: "Name", get: (r) => r.name },
    { header: "Email", get: (r) => r.email },
    { header: "Roll no", get: (r) => r.rollNo },
    { header: "Batch", get: (r) => r.batch },
    { header: "Target company", get: (r) => companyName(r.target) },
    { header: "Streak (days)", get: (r) => r.streak },
    { header: "XP", get: (r) => r.xp },
    { header: "Drills (7 days)", get: (r) => r.drills7 },
    { header: "Accuracy 30d (%)", get: (r) => r.accuracy30 },
    { header: "Readiness", get: (r) => r.readiness },
    { header: "Last active (IST)", get: (r) => ist(r.lastActiveAt) },
    { header: "At risk", get: (r) => (r.atRisk ? "Yes" : "No") },
    { header: "Reason", get: (r) => r.atRiskReasons.join("; ") },
  ]);
}
