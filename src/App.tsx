import { useState } from "react";
import { Search } from "./components/search";
import SearchResult from "./components/SearchResult.tsx";
import { SolrDoc } from "./types.ts";
import {usePersistentStore} from "./store/usePersistentStore.ts";

function App() {
  // const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SolrDoc[]>([]);

  const handleSearch = async (query: string) => {
    if (!query) return;
    // setError(null);
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
      // setError("Search Error: " + err.message);
    }
  };

  const handleResultClick = (doc: SolrDoc) => {
    const params = new URLSearchParams({
      wayback_date: String(doc.wayback_date),
      url: doc.url,
      source_file_path: doc.source_file_path ?? "",
      offset: String(doc.source_file_offset ?? ""),
    });
    usePersistentStore.getState().addNode({ url:doc.url });
    window.open(`/playback?${params.toString()}`, "_blank");
  };


  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "Pixelify Sans"  }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>
        SolrWayback Search
      </h1>
      <Search onSubmit={(value) => handleSearch(value)} />

      {/*{error && <div style={{ color: "red", marginTop: "12px" }}>{error}</div>}*/}

      {searchResults.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h3>Results ({searchResults.length})</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {searchResults.map((doc, idx) => (
              <SearchResult doc={doc} key={idx} onClick={() => handleResultClick(doc)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
