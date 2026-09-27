import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/* Ícono para "Agregar a pantalla de inicio" en iPhone. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#dc2626",
          gap: 6,
        }}
      >
        <div style={{ width: 112, height: 44, background: "#fbbf24", borderRadius: "56px 56px 8px 8px" }} />
        <div style={{ width: 120, height: 12, background: "#22c55e", borderRadius: 6 }} />
        <div style={{ width: 116, height: 20, background: "#451a03", borderRadius: 10 }} />
        <div style={{ width: 112, height: 18, background: "#fbbf24", borderRadius: "6px 6px 18px 18px" }} />
      </div>
    ),
    size
  );
}
