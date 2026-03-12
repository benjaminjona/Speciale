
export const getSearchUrl = (href: string) => {
  const match = href.match(/\/solrwayback\/services\/web(?:Proxy)?\/(\d{14})\/(.+)/);
  if (!match)return;
  const [, wd, originalUrl] = match;
  // Convert wayback_date (20031008060850) to Solr crawl_date format (2003-10-08T06:08:50Z)
  const crawlDate = `${wd.slice(0, 4)}-${wd.slice(4, 6)}-${wd.slice(6, 8)}T${wd.slice(8, 10)}:${wd.slice(10, 12)}:${wd.slice(12, 14)}Z`;
  const query = `url:"${originalUrl}" AND crawl_date:"${crawlDate}"`;
  const searchUrl = `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(query)}&grouping=false`;
  return searchUrl
}


export const getTimeJumpToastDescription = (pageCrawlTime: number, baseCrawlTime: number | null) => {
  if (!baseCrawlTime) return "No comparison date available";
  const d1 = new Date(pageCrawlTime < 10000000000 ? pageCrawlTime * 1000 : pageCrawlTime);
  const d2 = new Date(baseCrawlTime < 10000000000 ? baseCrawlTime * 1000 : baseCrawlTime);

  // 2. Sort so we always subtract the smaller from the larger
  const [start, end] = d1 < d2 ? [d1, d2] : [d2, d1];

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const lastDayOfPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += lastDayOfPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const plural = (num: number, label: string) => `${num} ${label}${num === 1 ? "" : "s"}`;
  return [
    years > 0 && plural(years, "year"),
    months > 0 && plural(months, "month"),
    days > 0 && plural(days, "day")
  ]
    .filter(Boolean)
    .join(", ");};
