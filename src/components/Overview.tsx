import { useMemo, useState } from "react";
import { useDomainJsonDump } from "../api/useDomainJsonDump";

type TreeLink = {
  id: string;
  url: string;
  wayback_date: number;
  links: TreeLink[] | any;
};

export type JsonDataLink = {
  id: string;
  wayback_date: number;
  url_norm: string;
  url_path: string;
  url: string;
  domain: string;
  links: string[];
};

const buildTreeWithClosestMatch = (
  data: JsonDataLink[],
  rootUrl: string,
  requestedTimestamp: number,
): TreeLink | null => {
  if (!data || !rootUrl) return null;

  const visited = new Set<string>();

  // Find the closest snapshot for a given URL
  const findClosestMatch = (
    url: string,
    wayback_date: number,
  ): JsonDataLink | undefined => {
    const candidates = data.filter(
      (item) => item.url === url || item.url_norm === url,
    );
    if (candidates.length === 0) return undefined;
    return candidates.reduce((closest, item) => {
      return Math.abs(item.wayback_date - wayback_date) <
        Math.abs(closest.wayback_date - wayback_date)
        ? item
        : closest;
    }, candidates[0]);
  };

  const findJsonMatch = (
    url: string,
    wayback_date: number,
    visited: Set<string>,
  ): TreeLink => {
    const closest = findClosestMatch(url, wayback_date);
    if (!closest || visited.has(closest.id)) {
      return { id: closest?.id || "", url, wayback_date, links: [] };
    }

    visited.add(closest.id);

    const childLinks: TreeLink[] =
      closest.links?.map((linkUrl) =>
        findJsonMatch(linkUrl, requestedTimestamp, visited),
      ) || [];

    return {
      id: closest.id,
      url: closest.url,
      wayback_date: closest.wayback_date,
      links: childLinks,
    };
  };

  return findJsonMatch(rootUrl, requestedTimestamp, visited);
};

const findLinksLengthById = (data: JsonDataLink[], id: string): number => {
  const item = data.find((d) => d.id === id);
  return item ? item.links.length : 0;
};

export const Overview = () => {
  const [href, setHref] = useState<string | null>(null);
  const { data, isLoading, isError } = useDomainJsonDump(href);
  const url = "http://www.kidpub.org:80/kidpub/kidpub-template.html/";
  const wayback_date = 19991007201128;

  const treeData = useMemo(() => {
    if (!data) return null; // wait until data is loaded
    return buildTreeWithClosestMatch(data, url, wayback_date);
  }, [data, url, wayback_date]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data</div>;

  console.log("Fetched data:", data?.length);
  console.log("treeData:", treeData);

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
