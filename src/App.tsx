import {useState} from "react";
import PlaybackViewer from "./PlaybackViewer";
import {Search} from "./components/search";
import {toaster, Toaster} from "./src/components/ui/toaster";
import {getSearchUrl, getTimeJumpToastDescription} from "./utils/util.ts";
import SearchResult from "./components/SearchResult.tsx";
import {SolrDoc} from "./types.ts";
import {Overview} from "./components/Overview.tsx";
// import {ClusterBubbleGraph} from "@/components/ClusterBubbleGraph.tsx";

interface PlaybackData {
  html: string;
  baseUrl: string;
}

function App() {
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [divergentPageResources, setDivergentPageResources] = useState(null);
  const [baseCrawlTime, setBaseCrawlTime] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<SolrDoc[]>([]);

  // Fetch the archived HTML content for a given playback URL, and set it in state for the PlaybackViewer to render.
  const getPlaybackFunction = async (url: string, isFromIFrame?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const htmlText = await response.text();
      const finalUrl = response.url;
      if (isFromIFrame) getDivergentResourcesFromView(finalUrl);

      setPlaybackData({html: htmlText, baseUrl: finalUrl});
    } catch (err: any) {
      setError("Playback Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };



  const getDivergentResources = async (source_file_path?: string, offset?: number, setBaseDate?: boolean) => {
    if (!source_file_path || offset === undefined) return;
    try {
      const url = `/solrwayback/services/timestampsforpage/?source_file_path=${encodeURIComponent(source_file_path)}&offset=${offset}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const pageCrawlDate: number = data?.pageCrawlDate;
      setDivergentPageResources(data);
      if (setBaseDate) setBaseCrawlTime(pageCrawlDate || null);
      if (!setBaseDate && pageCrawlDate !== baseCrawlTime) {
        const description = getTimeJumpToastDescription(pageCrawlDate, baseCrawlTime);
        toaster.create({
          title: "Time jump detected!",
          description: description,
          type: "warning"
        })
      }
    } catch (err) {
      console.error("Error fetching timestamps:", err);
    }
  };

  // Given a playback href like /solrwayback/services/web/20200115120000/http://example.com,
  // look up the Solr doc to get source_file_path/offset, then fetch page resources.
  const getDivergentResourcesFromView = async (href: string) => {
    const searchUrl = getSearchUrl(href);
    if (!searchUrl) return
    try {
      const response = await fetch(searchUrl);
      if (!response.ok) return;
      const data = await response.json();
      const doc = data?.response?.docs?.[0];
      getDivergentResources(doc.source_file_path, doc.source_file_offset, false);
    } catch (err) {
      console.error("Error resolving page resources for navigation:", err);
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
    const playbackUrl = `/solrwayback/services/web/${doc.wayback_date}/${doc.url}`;
    getPlaybackFunction(playbackUrl);
    getDivergentResources(doc.source_file_path, doc.source_file_offset, true);
  };

  return (

    <>
      <div style={{display: "flex"}}>
        <div style={{display: "flex", flexDirection: "column", width: "300px",height: "100vh", overflowY: "auto", padding: "10px"}}>
          <h1>SolrWayback Playback w/ Search</h1>

          <div>{new Date(Number(baseCrawlTime)).toString()}</div>
          <Toaster/>
          <Search onSubmit={(value) => handleSearch(value)}/>
          {error && (
            <div style={{color: "red"}}>{error}</div>
          )}

          {searchResults.length > 0 && (
            <div
            >
              <h3>Results ({searchResults.length})</h3>
              <ul style={{listStyle: "none", padding: 0, maxHeight: "400px" }}>
                {searchResults.map((doc, idx) => (
                  <SearchResult doc={doc} key={idx} onClick={() => handleResultClick(doc)}/>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{flex: 1}}>
          {/*{loading && <div>Loading playback...</div>}*/}

          {playbackData ? (
            <>
              {/*<h3>Playback View</h3>*/}
              Base URL: {playbackData.baseUrl}
              <PlaybackViewer
                getPlaybackFunction={getPlaybackFunction}
                htmlContent={playbackData.html}
                baseUrl={playbackData.baseUrl}
                pageResources={divergentPageResources}
              />
            </>
          ) : (
            !loading && (
              <div style={{padding: "20px", color: "#777"}}>
                Select a search result to view playback
              </div>
            )
          )}
        </div>

      </div>
        <Overview />
    </>

  );
}

export default App;
