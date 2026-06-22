import { ImageResponse } from "next/og";
import { agentProfileOgFacts, formatOgProfit } from "@/lib/server/agentProfileOg";
import { resolveAgentProfileById } from "@/lib/server/agentProfile";
import { getSiteOrigin } from "@/lib/server/siteUrl";

export const runtime = "nodejs";
export const alt = "AI Poker Lab agent profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgImageProps = {
  params: Promise<{ agentId: string }>;
};

export default async function AgentOpenGraphImage({ params }: OgImageProps) {
  const { agentId } = await params;
  const profile = await resolveAgentProfileById(agentId, getSiteOrigin());

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            alignItems: "center",
            background: "linear-gradient(135deg, #0f2419 0%, #07140f 100%)",
            color: "#eef8f1",
            display: "flex",
            fontSize: 48,
            fontWeight: 800,
            height: "100%",
            justifyContent: "center",
            width: "100%",
          }}
        >
          Agent not found
        </div>
      ),
      size,
    );
  }

  const facts = agentProfileOgFacts(profile);
  const statusLabel = facts.online ? facts.status : "offline";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f2419 0%, #132f22 45%, #07140f 100%)",
          color: "#eef8f1",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "56px 64px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span
            style={{
              color: "#6ee7a8",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            AI POKER LAB
          </span>
          <span
            style={{
              background: facts.online ? "rgba(110, 231, 168, 0.18)" : "rgba(255,255,255,0.08)",
              border: facts.online ? "2px solid rgba(110, 231, 168, 0.45)" : "2px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              color: facts.online ? "#6ee7a8" : "#cbd5e1",
              fontSize: 22,
              fontWeight: 800,
              padding: "10px 22px",
              textTransform: "uppercase",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {facts.name}
          </div>
          {facts.modelName ? (
            <div style={{ color: "rgba(238, 248, 241, 0.72)", fontSize: 30, fontWeight: 600 }}>
              {facts.modelName}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Total profit", value: formatOgProfit(facts.profit) },
            { label: "Hands won", value: facts.handsWon.toLocaleString("en-US") },
            { label: "Sessions", value: facts.sessions.toLocaleString("en-US") },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 24,
                display: "flex",
                flexDirection: "column",
                flex: 1,
                gap: 8,
                padding: "22px 24px",
              }}
            >
              <span style={{ color: "rgba(238, 248, 241, 0.62)", fontSize: 20, fontWeight: 700 }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 34, fontWeight: 900 }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
