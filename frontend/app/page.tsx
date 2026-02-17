import UploadForm from "../components/UploadForm";

export default function Page() {
  return (
    <main>
      <p style={{ marginTop: 0 }}>
        Upload any PGN and get a Stockfish-grounded pivot report narrated in plain language.
      </p>
      <UploadForm />
      <p style={{ opacity: 0.7, marginTop: 16 }}>
        Tip: depth 14 is a good default. If it's slow, drop depth to 12.
      </p>
    </main>
  );
}
