"use client";

// Last-resort boundary: replaces the root layout on a layout-level crash, so
// globals.css / Tailwind may not be loaded — style inline only.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#0f172a",
          color: "#fff",
          fontFamily: "inherit",
          textAlign: "center",
          padding: 24,
        }}
      >
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h1 style={{ margin: 0, fontSize: 22 }}>مشکلی پیش آمد</h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>خطایی غیرمنتظره رخ داد. لطفا دوباره تلاش کنید.</p>
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: "10px 28px",
            borderRadius: 12,
            border: "none",
            background: "#2e8dd3",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          تلاش دوباره
        </button>
      </body>
    </html>
  );
}
