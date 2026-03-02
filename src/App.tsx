import { useState } from "react";
import PlaybackViewer from "./PlaybackViewer";
import { Provider } from "./src/components/ui/provider";
import { Search } from "./components/search";
import { toaster, Toaster } from "./src/components/ui/toaster";

interface SolrDoc {
  wayback_date: number | string;
  url: string;
  [key: string]: any;
}

interface PlaybackData {
  html: string;
  baseUrl: string;
}

function App() {
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pageResources, setPageResources] = useState(null);
  const [baseCrawlTime, setBaseCrawlTime] = useState<number | null>(null);

  // Search states
  // const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SolrDoc[]>([]);

  const getPlaybackFunction = async (url: string,flag?:boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Use relative URL to leverage Vite proxy, preventing CORS issues if server doesn't allow it
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const htmlText = await response.text();
      // We also need the final URL to set the <base> tag correcty
      const finalUrl = response.url;
      if(flag) resolveAndFetchResources(finalUrl);

      setPlaybackData({ html: htmlText, baseUrl: finalUrl });
    } catch (err: any) {
      setError("Playback Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHarvestedPageResources = async (source_file_path: string, offset: number, setBaseDate?: boolean) => {
    console.log("here we are")
    console.log(setBaseDate);

    try {
      const url = `/solrwayback/services/timestampsforpage/?source_file_path=${encodeURIComponent(source_file_path)}&offset=${offset}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched page resources:", data);
      setPageResources(data);
      if (setBaseDate) {
        setBaseCrawlTime(data?.pageCrawlDate || null);
      } else {
        if (data.pageCrawlDate !== baseCrawlTime) {
          const baseDate = new Date(baseCrawlTime || 0);
          const pageDate = new Date(data.pageCrawlDate);
          const timeDiffMs = Math.abs(pageDate.getTime() - baseDate.getTime());
          const timeDiffDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
          const timeDiffHours = Math.floor((timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

          toaster.create({
            title: "Time jump detected!",
            description: `The page you are viewing has a different crawl date than the base date. Time difference: ${timeDiffDays} days and ${timeDiffHours} hours.`,
            type: "warning"
          })

        }
      }

    } catch (err) {
      console.error("Error fetching timestamps:", err);
    }
  };

  // Given a playback href like /solrwayback/services/web/20200115120000/http://example.com,
  // look up the Solr doc to get source_file_path/offset, then fetch page resources.
  const resolveAndFetchResources = async (href: string) => {
    const match = href.match(/\/solrwayback\/services\/web(?:Proxy)?\/(\d{14})\/(.+)/);
    if (!match) {
      console.warn("Could not parse playback href:", href);
      return;
    }

    const [, wd, originalUrl] = match;
    // Convert wayback_date (20031008060850) to Solr crawl_date format (2003-10-08T06:08:50Z)
    const crawlDate = `${wd.slice(0, 4)}-${wd.slice(4, 6)}-${wd.slice(6, 8)}T${wd.slice(8, 10)}:${wd.slice(10, 12)}:${wd.slice(12, 14)}Z`;
    const query = `url:"${originalUrl}" AND crawl_date:"${crawlDate}"`;
    console.log("here we are");
    console.log(query);
    const searchUrl = `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(query)}&grouping=false`;

    try {
      const response = await fetch(searchUrl);
      if (!response.ok) return;
      const data = await response.json();
      const doc = data?.response?.docs?.[0];
      if (doc?.source_file_path && doc?.source_file_offset != null) {
        getHarvestedPageResources(doc.source_file_path, doc.source_file_offset, false);
      }
    } catch (err) {
      console.error("Error resolving page resources for navigation:", err);
    }
  };

  // Wrapper passed to PlaybackViewer — loads playback HTML and fetches page resources in parallel

  const handleSearch = async (query: string) => {
    if (!query) return;

    setError(null);
    setSearchResults([]);

    try {
      const searchUrl = `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(query)}&grouping=false`;

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (data?.response?.docs) {
        setSearchResults(data.response.docs);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      setError("Search Error: " + err.message);
    }
  };

  const handleResultClick = (doc: SolrDoc) => {
    const playbackUrl = `/solrwayback/services/web/${doc.wayback_date}/${doc.url}`;
    getPlaybackFunction(playbackUrl);
    // Fetch page resources (timestamps/versions)
    if (doc.source_file_path && doc.source_file_offset) {
      getHarvestedPageResources(doc.source_file_path, doc.source_file_offset, true);
    }
  };

  return (
    <Provider>
      <div
        style={{
          padding: "20px",
          fontFamily: "sans-serif",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>SolrWayback Playback w/ Search</h1>
        <div>{new Date(Number(baseCrawlTime)).toString()}</div>
        <Toaster />

        {/* Search Section */}
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#ffffff",
            borderRadius: "5px",
          }}
        >
          <Search
            onSubmit={(value) => {
              // setSearchQuery(value);
              handleSearch(value);
            }}
          />
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: "15px" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "20px" }}>
          {/* Results List */}
          {searchResults.length > 0 && (
            <div
              style={{
                width: "300px",
                flexShrink: 0,
                maxHeight: "600px",
                overflowY: "auto",
                borderRight: "1px solid #ccc",
                paddingRight: "10px",
              }}
            >
              <h3>Results ({searchResults.length})</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {searchResults.map((doc, idx) => (
                  <li
                    key={idx}
                    style={{
                      marginBottom: "10px",
                      padding: "10px",
                      border: "1px solid #eee",
                      cursor: "pointer",
                      backgroundColor: "#fff",
                    }}
                    onClick={() => handleResultClick(doc)}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "14px",
                        wordBreak: "break-all",
                      }}
                    >
                      {doc.url}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      {doc.crawl_date || doc.wayback_date}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      {doc.content_type}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Playback Viewer */}
          <div style={{ flex: 1 }}>
            {loading && <div>Loading playback...</div>}

            {playbackData ? (
              <div style={{ border: "1px solid #ccc", padding: "10px" }}>
                <h3>Playback View</h3>
                <div
                  style={{
                    marginBottom: "10px",
                    fontSize: "small",
                    color: "#555",
                  }}
                >
                  Base URL: {playbackData.baseUrl}
                </div>
                <PlaybackViewer
                  getPlaybackFunction={getPlaybackFunction}
                  htmlContent={playbackData.html}
                  baseUrl={playbackData.baseUrl}
                  pageResources={pageResources}
                />
              </div>
            ) : (
              !loading && (
                <div style={{ padding: "20px", color: "#777" }}>
                  Select a search result to view playback
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </Provider>
  );
}

export default App;
