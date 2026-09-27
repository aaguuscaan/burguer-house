import { ImageResponse } from "next/og";

import { storeConfig } from "./data/store";

export const alt = `${storeConfig.name} · Pedí online`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Imagen que aparece al compartir el link (WhatsApp, Instagram, etc.). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #2a0d0d 0%, #120a0a 55%, #090909 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 10,
            color: "#ef4444",
            textTransform: "uppercase",
          }}
        >
          {storeConfig.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 30,
            fontSize: 110,
            fontWeight: 900,
            lineHeight: 0.95,
            textTransform: "uppercase",
          }}
        >
          <span>Comida real.</span>
          <span style={{ color: "#ef4444" }}>Sin vueltas.</span>
        </div>

        <div style={{ display: "flex", marginTop: 40, gap: 16 }}>
          {["Pedí online", "Delivery", "Retiro en el local"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "12px 26px",
                borderRadius: 999,
                background: label === "Pedí online" ? "#dc2626" : "rgba(255,255,255,0.08)",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
