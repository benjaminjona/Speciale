import React, { useEffect, useState } from "react";
import {
  PopoverRoot, PopoverContent, PopoverBody, PopoverCloseTrigger,
  Flex,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { proxyUrl, extractText, wordFreq, cosineSimilarity, similarityColor, fmtWayback } from "../utils/util";
import { DomainEntry } from "../types";

export interface VersionsPanelData {
  url: string;
  versions: DomainEntry[];
  currentTs: number;
}

interface Props {
  panel: VersionsPanelData | null;
  timeRange: [number, number];
  onClose: () => void;
}

const VersionsPanel: React.FC<Props> = ({ panel, timeRange, onClose }) => {
  const [htmlScores, setHtmlScores] = useState<Map<number, number | null>>(new Map());
  const [hoveredEntry, setHoveredEntry] = useState<DomainEntry | null>(null);

  useEffect(() => {
    if (!panel) return;
    const { versions, currentTs } = panel;
    setHtmlScores(new Map());

    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      const currentEntry = versions.find(v => v.wayback_date === currentTs);
      if (!currentEntry) return;

      let baseFreq: Map<string, number> | null = null;
      try {
        const res = await fetch(proxyUrl(currentEntry.wayback_date, currentEntry.url), { signal });
        if (res.ok) baseFreq = wordFreq(extractText(await res.text()));
      } catch { /* aborted or network error */ }

      if (!baseFreq || signal.aborted) return;
      setHtmlScores(prev => new Map(prev).set(currentTs, 1));

      for (const entry of versions) {
        if (signal.aborted) break;
        if (entry.wayback_date === currentTs) continue;
        try {
          const res = await fetch(proxyUrl(entry.wayback_date, entry.url), { signal });
          const score = res.ok
            ? cosineSimilarity(baseFreq, wordFreq(extractText(await res.text())))
            : null;
          setHtmlScores(prev => new Map(prev).set(entry.wayback_date, score));
        } catch {
          if (!signal.aborted) {
            setHtmlScores(prev => new Map(prev).set(entry.wayback_date, null));
          }
        }
      }
    })();

    return () => ac.abort();
  }, [panel]);

  if (!panel) return null;

  const [minTs, maxTs] = timeRange;
  const timeActive = !(minTs === 0 && maxTs === 0);

  return (
    <>
      <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 2000 }}>
        <PopoverRoot
          positioning={{ placement: "top-end" }}
          open={panel !== null}
          onOpenChange={(e) => { if (!e.open) onClose(); }}
        >
          <span style={{ display: "none" }} />
          <PopoverContent style={{
            backgroundColor: "#fff",
            color: "#002E70",
            borderRadius: "12px",
            padding: "20px",
            width: "360px",
            maxHeight: "520px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            border: "1px solid #e2e8f0",
            marginBottom: "8px",
            display: "flex",
            flexDirection: "column",
          }}>
            <PopoverBody style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Flex align="center" justify="space-between" style={{ marginBottom: "12px", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#002E70" }}>All Snapshots</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", wordBreak: "break-all", marginTop: "2px" }}>
                    {panel.url}
                  </div>
                </div>
                <PopoverCloseTrigger asChild>
                  <button
                    aria-label="Close"
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "transparent", border: "1.5px solid #002E70",
                      color: "#002E70", cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <LuX size={14} />
                  </button>
                </PopoverCloseTrigger>
              </Flex>

              <div style={{ marginBottom: "10px", flexShrink: 0 }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
                  {panel.versions.length} snapshot{panel.versions.length !== 1 ? "s" : ""} total
                  {htmlScores.size > 0 && htmlScores.size < panel.versions.length && (
                    <span style={{ color: "#94a3b8", marginLeft: 6 }}>
                      (loading {htmlScores.size}/{panel.versions.length}…)
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    height: 8, width: 80, borderRadius: 4,
                    background: "linear-gradient(to right, rgb(255,60,60), rgb(255,255,60), rgb(60,255,60))",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>Text similarity in page vs. current</span>
                </div>
              </div>

              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                {panel.versions.map((entry, i) => {
                  const isCurrent = entry.wayback_date === panel.currentTs;
                  const scoreVal = htmlScores.get(entry.wayback_date);
                  const score = !isCurrent && scoreVal !== undefined ? scoreVal : null;
                  const isLoading = !isCurrent && !htmlScores.has(entry.wayback_date);
                  const dotColor = score !== null ? similarityColor(score) : null;
                  const pct = score !== null ? Math.round(score * 100) : null;
                  const outOfRange = timeActive && (entry.wayback_date < minTs || entry.wayback_date > maxTs);
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredEntry(entry)}
                      onMouseLeave={() => setHoveredEntry(null)}
                      title={outOfRange ? "Outside selected time interval" : undefined}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: isCurrent ? 700 : 400,
                        color: outOfRange ? "#b0b8c4" : (isCurrent ? "#002E70" : "#475569"),
                        backgroundColor: isCurrent && !outOfRange ? "#EBF4FF" : "transparent",
                        border: isCurrent && !outOfRange ? "1.5px solid #C7D9F5" : "1px solid transparent",
                        opacity: outOfRange ? 0.45 : 1,
                        display: "flex", alignItems: "center", gap: "8px",
                      }}
                    >
                      {isCurrent ? (
                        <span style={{ fontSize: "10px", background: "#002E70", color: "#fff", borderRadius: "4px", padding: "1px 5px", flexShrink: 0 }}>
                          in tree
                        </span>
                      ) : isLoading ? (
                        <span style={{
                          width: 10, height: 10, borderRadius: "50%",
                          backgroundColor: "#e2e8f0", flexShrink: 0, display: "inline-block",
                          animation: "pulse 1.2s ease-in-out infinite",
                        }} />
                      ) : dotColor !== null ? (
                        <span
                          title={`${pct}% Text similarity`}
                          style={{
                            width: 10, height: 10, borderRadius: "50%",
                            backgroundColor: dotColor,
                            flexShrink: 0, display: "inline-block",
                            border: "1px solid rgba(0,0,0,0.15)",
                          }}
                        />
                      ) : (
                        <span title="Could not fetch" style={{ width: 10, height: 10, flexShrink: 0, display: "inline-block", color: "#94a3b8", fontSize: 10, lineHeight: "10px" }}>?</span>
                      )}
                      <span style={{ flex: 1 }}>{fmtWayback(entry.wayback_date)}</span>
                      {pct !== null && (
                        <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>{pct}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
            </PopoverBody>
          </PopoverContent>
        </PopoverRoot>
      </div>

      {hoveredEntry && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24 + 360 + 12,
          width: 300,
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "10px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          border: "1px solid #e2e8f0",
          zIndex: 2001,
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px", wordBreak: "break-all" }}>
            {fmtWayback(hoveredEntry.wayback_date)}
          </div>
          <div style={{
            border: "1px solid #e2e8f0", borderRadius: "6px",
            overflow: "hidden", width: 280, height: 175,
            position: "relative", background: "#f8fafc",
          }}>
            <iframe
              key={hoveredEntry.wayback_date}
              src={proxyUrl(hoveredEntry.wayback_date, hoveredEntry.url)}
              style={{
                width: 1024, height: 640,
                transform: "scale(0.2734375)",
                transformOrigin: "top left",
                pointerEvents: "none",
                border: "none",
                display: "block",
              }}
              sandbox="allow-scripts allow-same-origin"
              scrolling="no"
              loading="lazy"
              title="Version preview"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default VersionsPanel;
