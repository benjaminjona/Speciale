import { DomainEntry } from "../types";
import { useQuery } from "@tanstack/react-query";

const fetchDomainJsonDump = async (href: string): Promise<DomainEntry[]> => {
  const normalizedHref = href.startsWith("http") ? href : `http://${href}`;
  const urlObj = new URL(normalizedHref);
  const domain = urlObj.hostname.replace(/^www\./, '');

  const baseUrl = "/solrwayback/services/export/fields";

  const params = new URLSearchParams();
  params.append("query", "* ");
  params.append("fq", `domain:"${domain}"`);
  params.append("fq", 'content_type_norm:"html"');
  params.append("fields", "wayback_date,url,url_norm,domain,links,id,source_file_path,source_file_offset");
  params.append("flatten", "false");
  params.append("format", "json");
  params.append("gzip", "false");

  const response = await fetch(`${baseUrl}?${params.toString()}`);
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
