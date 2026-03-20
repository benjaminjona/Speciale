import { useState } from "react";
import { Search } from "./components/search";
import SearchResult from "./components/SearchResult.tsx";
import { SolrDoc } from "./types.ts";
import {usePersistentStore} from "./store/usePersistentStore.ts";
import { Button, HStack, Text } from "@chakra-ui/react";

function App() {
  // const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SolrDoc[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  const handleSearch = async (query: string, page: number = 0) => {
    if (!query) return;
    // setError(null);
    setSearchResults([]);
    try {
      const start = page * PAGE_SIZE;
      const searchUrl = `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(query)}&grouping=false&start=${start}`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const data = await response.json();
      
      setCurrentQuery(query);
      setCurrentPage(page);
      
      if (data?.response?.numFound !== undefined) {
        setTotalResults(data.response.numFound);
      }

      if (data?.response?.docs) {
        setSearchResults(data.response.docs);
        window.scrollTo(0, 0);
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
      <Search onSubmit={(value) => handleSearch(value, 0)} />

      {/*{error && <div style={{ color: "red", marginTop: "12px" }}>{error}</div>}*/}

      {searchResults.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h3>Results ({currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalResults)} of {totalResults})</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {searchResults.map((doc, idx) => (
              <SearchResult doc={doc} key={idx} onClick={() => handleResultClick(doc)} />
            ))}
          </ul>
          
          <HStack justify="space-between" mt={6}>
            <Button 
              disabled={currentPage === 0} 
              onClick={() => handleSearch(currentQuery, currentPage - 1)}
              variant="outline"
            >
              Previous
            </Button>
            <Text fontWeight="medium">Page {currentPage + 1}</Text>
            <Button 
              disabled={(currentPage + 1) * PAGE_SIZE >= totalResults} 
              onClick={() => handleSearch(currentQuery, currentPage + 1)}
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </div>
      )}
    </div>
  );
}

export default App;
