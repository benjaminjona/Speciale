
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


export const getTimeJumpToastDescription = (pageCrawlDate:number, baseCrawlTime:number| null) => {
  const baseDate = new Date(baseCrawlTime || 0);
  const pageDate = new Date(pageCrawlDate);
  const timeDiffMs = Math.abs(pageDate.getTime() - baseDate.getTime());
  const timeDiffDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
  const timeDiffHours = Math.floor((timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return `The page you are viewing has a different crawl date than the base date. Time difference: ${timeDiffDays} days and ${timeDiffHours} hours.`
}

