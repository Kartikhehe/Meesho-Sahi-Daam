"use client";

/**
 * Last line of defence: an error in the root layout itself. Must not depend on
 * app styles or the shell, because those are what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#F7F7FA",
          color: "#1C1C28",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Sahi Daam could not start</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#5A5A72" }}>
            Reload the page. If it keeps happening, restart the dev server.
          </p>
          <p style={{ marginTop: 12, fontSize: 12, color: "#8A8AA3" }}>{error.message}</p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              height: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 6,
              background: "#F43397",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
