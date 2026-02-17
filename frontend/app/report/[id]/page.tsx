import ReportView from "../../../components/ReportView";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function getReport(id: string) {
  const res = await fetch(`${API_BASE}/api/report/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function Page({ params }: { params: { id: string } }) {
  const report = await getReport(params.id);

  if (!report) {
    return (
      <main>
        <p>Report not ready yet (or not found).</p>
        <p>
          Go back to the <a href="/">upload page</a> and try again, or wait a moment.
        </p>
      </main>
    );
  }

  return (
    <main>
      <p><a href="/">← Analyze another PGN</a></p>
      <ReportView report={report} />
    </main>
  );
}
