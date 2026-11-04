"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7F8FB", color: "#111827", margin: 0 }}>
        <main style={{ maxWidth: 360, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: 16 }}>
          <h1 style={{ color: "#0F1B3D", fontSize: 20 }}>LearnCrew is having trouble</h1>
          <p>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, minHeight: 44, borderRadius: 8, border: 0, background: "#0F1B3D", color: "#fff", fontWeight: 600 }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
