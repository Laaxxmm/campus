export const COMPANIES = [
  { id: "tcs_nqt", name: "TCS NQT" },
  { id: "infosys", name: "Infosys" },
  { id: "accenture", name: "Accenture" },
  { id: "cognizant", name: "Cognizant" },
  { id: "wipro", name: "Wipro" },
  { id: "capgemini", name: "Capgemini" },
] as const;
export type CompanyId = (typeof COMPANIES)[number]["id"];
export const COMPANY_IDS = COMPANIES.map((c) => c.id) as CompanyId[];
export function companyName(id: string | null | undefined) {
  return COMPANIES.find((c) => c.id === id)?.name ?? id ?? "—";
}
export function isCompany(id: unknown): id is CompanyId {
  return typeof id === "string" && (COMPANY_IDS as string[]).includes(id);
}
