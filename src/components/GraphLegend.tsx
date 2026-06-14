import React from "react";
import { COLORS } from "./graphColors";

const GraphLegend: React.FC = () => (
  <div style={{
    position: "absolute", top: "10px", left: "10px",
    backgroundColor: "rgba(255,255,255,0.93)",
    backdropFilter: "blur(6px)",
    border: "1px solid #C7D9F5",
    borderRadius: "8px",
    padding: "8px 10px",
    display: "flex", flexDirection: "column", gap: "5px",
    pointerEvents: "none",
    boxShadow: "0 1px 6px rgba(0,46,112,0.10)",
  }}>
    {([
      { color: COLORS.expandable, border: COLORS.unvisitedBorder, label: "Links" },
      { color: COLORS.leaf, border: COLORS.leafBorder, label: "No links" },
    ] as { color: string; border: string; label: string }[]).map(({ color, border, label }) => (
      <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
        <div style={{
          width: 11, height: 11, borderRadius: "50%",
          backgroundColor: color,
          border: `1.5px solid ${border}`,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>{label}</span>
      </div>
    ))}
    <div style={{ borderTop: "1px solid #E2E8F0", margin: "2px 0" }} />
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: COLORS.expandable, border: `2.5px solid ${COLORS.visitedBorder}`, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>Visited</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: COLORS.current, border: `1.5px solid ${COLORS.visitedBorder}`, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>You are here</span>
    </div>
    <div style={{ borderTop: "1px solid #E2E8F0", margin: "2px 0" }} />
    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
      <div style={{
        width: 11, height: 11,
        backgroundColor: "#FFD700",
        border: "1.5px solid #B8860B",
        flexShrink: 0,
      }} />
      <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>External domain</span>
    </div>
  </div>
);

export default GraphLegend;
