import { useMemo } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump.ts";
import {buildTreeWithClosestMatch} from "../utils/treeUtils.ts";
import SigmaGraph from "../components/SigmaGraph.tsx";
import {usePersistentStore} from "../store/usePersistentStore.ts";
import {epochToWaybackNumber} from "../utils/util.ts";

export type JsonDataLink = {
  id: string;
  wayback_date: number;
  url_norm: string;
  url: string;
  links: string[];
};

export const OverviewPage = () => {
  // const url1 = "http://www.kidpub.org:80/kidpub";
  const url = usePersistentStore((state) => state.baseUrl);
  // const wayback_date = 19970404180804;
  const wayback_date = usePersistentStore((state) => state.baseCrawlTime) ;
  // const domain = "kidpub.org";
  const newUrl = new URL(url);
  const date = epochToWaybackNumber(wayback_date)
  let hostname = newUrl.hostname;
  const domain = hostname.replace(/^www\./, '');
  // const { data, isLoading, isError } = useDomainJsonDump("http://www.kidpub.org/kidpub");
  const clearNodes = usePersistentStore((state) => state.clearNodes);
  const { data, isLoading, isError } = useDomainJsonDump(url);
  // console.log("newUrl:",newUrl,"hostman:", hostname,domain,date,url,data,);


  const treeData = useMemo(() => {
    if (!data) return null;
  // console.log("in here", data.length, )
    return buildTreeWithClosestMatch(data, url, date, domain);
  }, [data, url, date]);
  // console.log(treeData, )

  // const treeData = buildTreeWithClosestMatch(data, url, wayback_date, domain)
  return (
    <div style={{ padding: "16px", maxWidth: "100%", overflow: "hidden", height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "12px", flexWrap: "wrap", gap: "10px",
      }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Overview of the domain</h1>
        <button
          onClick={() => { clearNodes(); window.location.reload(); }}
          title="Clear all saved data and reload"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600,
            color: "#b91c1c", backgroundColor: "#fff1f2",
            border: "1px solid #fca5a5", borderRadius: "8px",
            cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fee2e2";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f87171";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff1f2";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5";
          }}
        >
          ↺ Clear &amp; Reset
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
        <SigmaGraph treeData={treeData} domain={domain} />
      )}
    </div>
  );
};
