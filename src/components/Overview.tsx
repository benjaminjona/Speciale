import { useMemo, useState } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";
import {buildTreeWithClosestMatch} from "../utils/treeUtils.ts";
import SigmaGraph from "./SigmaGraph.tsx";

export type JsonDataLink = {
  id: string;
  wayback_date: number;
  url_norm: string;
  url_path: string;
  url: string;
  domain: string;
  links: string[];
};

// Count total nodes and max depth from tree
const getTreeStats = (node: any): { total: number; maxDepth: number; leafCount: number } => {
  if (!node) return { total: 0, maxDepth: 0, leafCount: 0 };
  let total = 1;
  let maxDepth = 0;
  let leafCount = 0;
  if (Array.isArray(node.links) && node.links.length > 0) {
    for (const child of node.links) {
      const childStats = getTreeStats(child);
      total += childStats.total;
      maxDepth = Math.max(maxDepth, childStats.maxDepth + 1);
      leafCount += childStats.leafCount;
    }
  } else {
    leafCount = 1;
  }
  return { total, maxDepth, leafCount };
};

export const Overview = () => {
  const [href, setHref] = useState<string | null>(null);
  const { data, isLoading, isError } = useDomainJsonDump(href);
  const url = "http://www.kidpub.org:80/kidpub/";
  const wayback_date = 19970404180804;
  const domain = "kidpub.org";

  const treeData = useMemo(() => {
    if (!data) return null;
    return buildTreeWithClosestMatch(data, url, wayback_date, domain);
  }, [data, url, wayback_date]);

  const treeStats = useMemo(() => getTreeStats(treeData), [treeData]);

  return (
    <div style={{ padding: "16px", maxWidth: "100%", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "12px", flexWrap: "wrap", gap: "10px",
      }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Site Structure Overview</h1>
        <button
          onClick={() => setHref("http://www.kidpub.org/kidpub")}
          style={{
            padding: "6px 16px", borderRadius: "8px", border: "none",
            backgroundColor: "#6366f1", color: "#fff", fontWeight: 600,
            cursor: "pointer", fontSize: "13px",
          }}
        >
          Fetch Resources for Kidlink
        </button>
      </div>

      {isLoading && (
        <div style={{
          padding: "40px", textAlign: "center", color: "#64748b",
          backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0",
        }}>
          Loading domain data...
        </div>
      )}
      {isError && (
        <div style={{
          padding: "16px", color: "#dc2626", backgroundColor: "#fef2f2",
          borderRadius: "8px", border: "1px solid #fecaca",
        }}>
          Error fetching data. Please try again.
        </div>
      )}

      {treeData && (
        <>
          {/* Summary stats */}
          <div style={{
            display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap",
          }}>
            {[
              { label: "Total Pages", value: treeStats.total, color: "#6366f1" },
              { label: "Max Depth", value: treeStats.maxDepth, color: "#0ea5e9" },
              { label: "Leaf Pages", value: treeStats.leafCount, color: "#22c55e" },
              { label: "Raw Records", value: data?.length ?? 0, color: "#f97316" },
            ].map((s) => (
              <div key={s.label} style={{
                flex: "1 1 120px", padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: s.color }}>
                  {s.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Tip for large data */}
          {treeStats.total > 100 && (
            <div style={{
              padding: "8px 14px", marginBottom: "10px", borderRadius: "8px",
              backgroundColor: "#fffbeb", border: "1px solid #fde68a",
              fontSize: "12px", color: "#92400e",
            }}>
              Large dataset detected ({treeStats.total.toLocaleString()} pages). Click grey collapsed nodes to expand branches on demand.
            </div>
          )}

          <SigmaGraph treeData={treeData} />
        </>
      )}
    </div>
  );
};
