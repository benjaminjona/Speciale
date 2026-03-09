import { useMemo, useState } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";
import {buildTreeWithClosestMatch} from "../utils/treeUtils.ts";
// import {DomainGraph} from "../components/DomainGraph.tsx";
// import {ClusterBubbleGraph} from "../components/ClusterBubbleGraph.tsx";
// import {CytoscapeDomainGraph} from "../components/CytoscapeDomainGraph.tsx";
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
  const [href, setHref] = useState<string | null>(null);
  const { data, isLoading, isError } = useDomainJsonDump(href);
  const url = "http://www.kidpub.org:80/kidpub/";
  const wayback_date = 19970404180804;
  const domain = "kidpub.org";

  const treeData = useMemo(() => {
    if (!data) return null; // wait until data is loaded
    return buildTreeWithClosestMatch(data, url, wayback_date, domain);
  }, [data, url, wayback_date]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data</div>;

  console.log("Fetched data:", data?.length);
  console.log("treeData:", treeData);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      <button
        onClick={() => setHref("http://www.kidpub.org/kidpub")}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Fetch Resources for Kidlink
      </button>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error fetching data.</p>}
      {/*{treeData && <DomainGraph treeData={treeData}/>}*/}
      {/*{treeData &&<ClusterBubbleGraph treeData={treeData}/> }*/}
      {/*{treeData && <CytoscapeDomainGraph treeData={treeData}/> }*/}
      {/*{treeData && <SigmaClusterGraph treeData={treeData}/> }*/}
      {treeData && <SigmaGraph treeData={treeData}/> }
    </div>
  );
};
