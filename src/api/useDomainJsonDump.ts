import { JsonDataLink } from "@/pages/OverviewPage.tsx";
import { useQuery } from "@tanstack/react-query";

const fetchDomainJsonDump = async (href: string): Promise<JsonDataLink[]> => {
  const normalizedHref = href.startsWith("http") ? href : `http://${href}`;
  const urlObj = new URL(normalizedHref);
  const domain = urlObj.hostname.replace(/^www\./, '');

  // CHANGE THIS LINE: Remove http://localhost:8080
  // Use the path that matches your proxy config
  const baseUrl = "/solrwayback/services/export/fields";

  const params = new URLSearchParams();
  params.append("query", "* ");
  params.append("fq", `domain:"${domain}"`);
  params.append("fq", 'content_type_norm:"html"');
  params.append("fields", "wayback_date,url,url_norm,domain,links,id,source_file_path,source_file_offset");
  params.append("flatten", "false");
  params.append("format", "json");
  params.append("gzip", "false");

  const searchUrl = `${baseUrl}?${params.toString()}`;

  // Now the browser sees: GET http://localhost:5173/solrwayback/services/...
  // Vite then forwards it to 8080, and no CORS error occurs!
  const response = await fetch(searchUrl);
  console.log(response,searchUrl)

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  return response.json();
};

export const useDomainJsonDump = (href: string | null) => {
  return useQuery({
    queryKey: ["domainJsonDump", href],
    queryFn: () => fetchDomainJsonDump(href!),
    enabled: !!href,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};
