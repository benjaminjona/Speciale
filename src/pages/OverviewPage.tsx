import { useMemo } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";
import { buildTreeWithClosestMatch } from "../utils/treeUtils";
import SigmaGraph from "../components/SigmaGraph";
import { usePersistentStore } from "../store/usePersistentStore";
import { epochToWaybackNumber } from "../utils/util";

export const OverviewPage = () => {
  const url = usePersistentStore((state) => state.baseUrl);
  const wayback_date = usePersistentStore((state) => state.baseCrawlTime);
  const newUrl = new URL(url);
  const date = epochToWaybackNumber(wayback_date);
  const domain = newUrl.hostname.replace(/^www\./, '');
  const clearNodes = usePersistentStore((state) => state.clearNodes);
  const { data, isLoading, isError } = useDomainJsonDump(url);

  const treeData = useMemo(() => {
    if (!data) return null;
    return buildTreeWithClosestMatch(data, url, date, domain);
  }, [data, url, date]);

  return (
    <div style={{ maxWidth: "100%", overflow: "hidden", height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
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
        <SigmaGraph treeData={treeData} domain={domain} data={data ?? undefined} onClear={() => { clearNodes(); window.location.reload(); }} />
      )}
    </div>
  );
};
