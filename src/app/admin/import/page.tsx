import { staffContext } from "@/server/staff";
import { TpoShell } from "@/components/TpoShell";
import { CsvDropzone } from "@/components/admin/CsvDropzone";

export const dynamic = "force-dynamic";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, collegeId } = await staffContext((await searchParams).college);
  return (
    <TpoShell title="Import roster" subtitle="Upload a CSV of your students. We check every row first — nothing is saved until you confirm. Re-uploading the same file is safe: existing students are matched by email and updated, never duplicated." collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/admin/import", label: "Import roster" }]}>
      <CsvDropzone collegeId={user.role === "superadmin" ? collegeId : undefined} />
    </TpoShell>
  );
}
