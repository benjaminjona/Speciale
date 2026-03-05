import { useState } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";

type dataProperties = {
  url: string;
  wayback_date: number;
  links: dataProperties[] | any;
}

export type jsonData = {
  id : string;
  wayback_date: number;
  url_norm: string;
  url_path: string;
  url : string;
  domain: string;
  links: string[];
}

export const Overview = () => {
  const [href, setHref] = useState<string | null>(null);
  const { data, isLoading, isError } = useDomainJsonDump(href);
  const url = "http://www.kidpub.org:80/kidpub/kidpub-template.html/";
  const wayback_date = 19991007201128;

  const findJsonMatch = (url: string, wayback_date: number, visited = new Set<string>()): dataProperties => {
    if (!data) return { url: "", wayback_date: 0, links: [] };
    if (visited.has(url)) return { url, wayback_date, links: [] };
    visited.add(url);

    const urljSON = data.find(item => {
      return item.wayback_date === wayback_date && item.url === url;
    });

    //console.log("Found JSON item:", urljSON);

    const result = urljSON?.links?.map(link => {
      const dataProperty = findJsonMatch(link, wayback_date, new Set(visited));
      return dataProperty;
    });

    // TODO: create a function that finds the clostest match from url and date 
    // const findClosestMatch = (url: string, wayback_date: number): dataProperties | null => {

    return {
      url: urljSON?.url || url,
      wayback_date: urljSON?.wayback_date || wayback_date,
      links: result || []
    };
  }

console.log(findJsonMatch(url, wayback_date));

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