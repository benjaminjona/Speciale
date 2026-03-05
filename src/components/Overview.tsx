import { useState } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";

export const Overview = () => {
  const [href, setHref] = useState<string | null>(null);
  const { data, isLoading, isError } = useDomainJsonDump(href);
  console.log("Domain JSON Dump Data:", data);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      {/*{data.map(data => (data))}*/}

      <p className="text-gray-300 mb-2">Fetching data for specific domains.</p>
      <button
        onClick={() => setHref("kidlink.org")}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Fetch Resources for Kidlink
      </button>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error fetching data.</p>}
      {/* {data && <pre>{JSON.stringify(data, null, 2)}</pre>} */}
    </div>
  );
};