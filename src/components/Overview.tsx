import {useState} from "react";

export const Overview = () => {
  const [data, setData] = useState(null);
  const getDomainJsonDump = async (href: string) => {
    try {
      // 1. Ensure href has a protocol so the URL constructor doesn't crash
      const normalizedHref = href.startsWith('http') ? href : `http://${href}`;
      const urlObj = new URL(normalizedHref);
      const domain = urlObj.hostname;

      const baseUrl = "solrwayback/services/export/fields";

      const params = new URLSearchParams();
      // Use the original 'href' for the query if that's how it's indexed,
      // or normalizedHref if you want the full URL.
      params.append("query", `domain:${domain}`);
      params.append("fq", `domain:"${domain}"`);
      params.append("fq", 'content_type_norm:"html"');
      params.append("fields", "wayback_date,url,url_path,url_norm,domain,links,id,source_file_path,source_file_offset");
      params.append("flatten", "false");
      params.append("format", "json");
      params.append("gzip", "false");

      const searchUrl = `${baseUrl}?${params.toString()}`;
      console.log("Requesting:", searchUrl);

      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.warn(`Fetch failed with status: ${response.status}`);
        return;
      }

      const data = await response.json();
      setData(data);
      console.log("Data received:", data);
      return data;

    } catch (err) {
      console.error("Error resolving page resources for navigation:", err);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Overview</h1>
      {/*{data.map(data => (data))}*/}

      <p className="text-gray-300 mb-2">Fetching data for specific domains.</p>
      <button
        onClick={() => getDomainJsonDump("kidlink.org")}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Fetch Resources for Kidlink
      </button>
    </div>
  );
};