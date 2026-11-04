import { staffContext } from "@/server/staff";
import { batchList, studentRows } from "@/server/services/tpo";
import { TpoShell } from "@/components/TpoShell";
import { StudentsTable } from "@/components/tpo/StudentsTable";

export const dynamic = "force-dynamic";

export default async function Students({ searchParams }: { searchParams: Promise<{ college?: string }> }) {
  const { user, college, opts } = await staffContext((await searchParams).college);
  const [rows, bl] = await Promise.all([studentRows(user, opts), batchList(user, opts)]);
  return (
    <TpoShell title="Students" subtitle="Search, sort and export your roster. Click a name for the full drill-down." collegeName={college.name} crumbs={[{ href: "/tpo", label: "Overview" }, { href: "/tpo/students", label: "Students" }]}>
      <StudentsTable rows={rows} batches={bl.map((b) => ({ id: b.id, name: b.name }))} />
    </TpoShell>
  );
}
