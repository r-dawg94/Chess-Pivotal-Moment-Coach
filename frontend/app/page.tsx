import UploadForm from "../components/UploadForm";

export default function Page() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 28, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ margin: 0, fontSize: 44, fontWeight: 800 }}>Chess Pivot Coach</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Paste a PGN, analyze, then get a plain-English report for the biggest turning points.
      </p>
      <div style={{ marginTop: 18 }}>
        <UploadForm />
      </div>
    </main>
  );
}
