export const stripWww = (url: string): string => {
  return url.replace(/^(https?:\/\/)www\./i, '$1');
};

export const getSearchUrl = (href: string): string | undefined => {
  const match = href.match(/\/solrwayback\/services\/web(?:Proxy)?\/(\d{14})\/(.+)/);
  if (!match) return;
  const [, wd, originalUrl] = match;
  const crawlDate = `${wd.slice(0, 4)}-${wd.slice(4, 6)}-${wd.slice(6, 8)}T${wd.slice(8, 10)}:${wd.slice(10, 12)}:${wd.slice(12, 14)}Z`;
  const query = `url:"${originalUrl}" AND crawl_date:"${crawlDate}"`;
  return `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(query)}&grouping=false`;
};

export const proxyUrl = (wayback_date: number, url: string): string =>
  `/solrwayback/services/webProxy/${wayback_date}/${url}`;

export const isExternalNode = (url: string, domain?: string): boolean => {
  if (!domain || !url) return false;
  try {
    const hostname = new URL(url.startsWith("http") ? url : `http://${url}`).hostname.replace(/^www\./, "");
    return !hostname.endsWith(domain) && hostname !== domain;
  } catch {
    return !url.includes(domain);
  }
};
