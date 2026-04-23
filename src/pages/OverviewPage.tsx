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
    <div style={{maxWidth: "100%", overflow: "hidden", height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>

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
