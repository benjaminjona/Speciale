import { useMemo } from "react";
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

export const Overview = () => {
  const { data, isLoading, isError } = useDomainJsonDump("http://www.kidpub.org/kidpub");
  const url = "http://www.kidpub.org:80/kidpub/";
  const wayback_date = 19970404180804;
  const domain = "kidpub.org";

  const treeData = useMemo(() => {
    if (!data) return null;
    return buildTreeWithClosestMatch(data, url, wayback_date, domain);
  }, [data, url, wayback_date]);

  return (
    <div style={{ padding: "16px", maxWidth: "100%", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "12px", flexWrap: "wrap", gap: "10px",
      }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Overview of the domain</h1>
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
        <SigmaGraph treeData={treeData} domain={domain} />
      )}
    </div>
  );
};
