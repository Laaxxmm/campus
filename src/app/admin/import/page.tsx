import { staffContext } from "@/server/staff";
import { TpoShell } from "@/components/TpoShell";
import { CsvDropzone } from "@/components/admin/CsvDropzone";

export const dynamic = "force-dynamic";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, collegeId } = await staffContext((await searchParams).college);
  return (
    <TpoShell title="Import roster" collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/admin/import", label: "Import roster" }]}>
      <p className="mb-4 max-w-2xl text-sm text-text-600">Upload a CSV of your students. We check every row first — nothing is saved until you confirm. Re-uploading the same file is safe: existing students are matched by email and updated, never duplicated.</p>
      <CsvDropzone collegeId={user.role === "superadmin" ? collegeId : undefined} />
    </TpoShell>
  );
}
