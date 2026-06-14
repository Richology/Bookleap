import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "书跃 BookLeap - 免费 AI 拆书工具";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f2",
          color: "#201a17",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 1092,
            height: 522,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 56,
            border: "1px solid rgba(32, 26, 23, 0.12)",
            borderRadius: 28,
            background: "#fffdf9",
            padding: "68px 76px",
          }}
        >
          <div
            style={{
              width: 520,
              height: 312,
              display: "flex",
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 28px 70px rgba(32, 26, 23, 0.14)",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 28,
                padding: 52,
                background: "#efe4d5",
              }}
            >
              <div style={{ width: 210, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
              <div style={{ width: 210, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
              <div style={{ width: 160, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
            </div>
            <div style={{ width: 4, background: "rgba(32,26,23,.18)" }} />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 28,
                padding: 52,
                background: "#e6d7c4",
              }}
            >
              <div style={{ width: 210, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
              <div style={{ width: 210, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
              <div style={{ width: 160, height: 14, borderRadius: 999, background: "rgba(32,26,23,.3)" }} />
            </div>
          </div>

          <div
            style={{
              width: 430,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: -1 }}>
              书跃
            </div>
            <div style={{ marginTop: 8, fontSize: 38, fontWeight: 800 }}>
              BookLeap
            </div>
            <div
              style={{
                marginTop: 48,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                color: "#6d5f55",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              <div>免费 AI 拆书工具</div>
              <div>高效读书 · 电子书拆解</div>
            </div>
            <div
              style={{
                marginTop: 52,
                width: 230,
                height: 54,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                background: "#201a17",
                color: "#fffdf9",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              bookleap.cn
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
