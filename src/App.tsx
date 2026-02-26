import { useState } from "react";
import PlaybackViewer from "./PlaybackViewer";
import { Provider } from "./src/components/ui/provider";
import { Search } from "./components/search";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SolrDoc[]>([]);

  const getPlaybackFunction = async (url: string) => {
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

      setPlaybackData({ html: htmlText, baseUrl: finalUrl });
    } catch (err: any) {
      setError("Playback Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHarvestedPageResources = async (source_file_path: string, offset: number) => {
    try {
      const url = `/solrwayback/services/timestampsforpage/?source_file_path=${encodeURIComponent(source_file_path)}&offset=${offset}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPageResources(data);
      setBaseCrawlTime(data?.pageCrawlDate || null);
    } catch (err) {
      console.error("Error fetching timestamps:", err);
    }
  };

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
    console.log("Clicking");
    const playbackUrl = `/solrwayback/services/web/${doc.wayback_date}/${doc.url}`;
    getPlaybackFunction(playbackUrl);
    // Fetch page resources (timestamps/versions)
    if (doc.source_file_path && doc.source_file_offset) {
      getHarvestedPageResources(doc.source_file_path, doc.source_file_offset);
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
              setSearchQuery(value);
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
            {/*  {pageResources && (*/}
            {/*  <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>*/}
            {/*    <h3>Page Resources ({pageResources.length || 0})</h3>*/}
            {/*    <pre style={{ maxHeight: '200px', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '10px' }}>*/}
            {/*      {JSON.stringify(pageResources, null, 2)}*/}
            {/*    </pre>*/}
            {/*  </div>*/}
            {/*)}*/}
          </div>
        </div>
      </div>
    </Provider>
  );
}

export default App;
