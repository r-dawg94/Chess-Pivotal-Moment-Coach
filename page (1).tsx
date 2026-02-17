export const metadata = { title: "Chess Pivot Coach" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", margin: 0 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
          <h1 style={{ marginTop: 0 }}>Chess Pivot Coach</h1>
          {children}
        </div>
      </body>
    </html>
  );
}
