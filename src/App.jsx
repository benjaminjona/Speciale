import React, { useState } from 'react';
import PlaybackViewer from './PlaybackViewer';

function App() {
  const [playbackData, setPlaybackData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const getPlaybackFunction = async (url) => {
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
    } catch (err) {
      setError("Playback Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // Proxy request to SolrWayback search API
      // Adjust path if your SolrWayback deployment context path is different
      const searchUrl = `/solrwayback/services/frontend/solr/search/results/?query=${encodeURIComponent(searchQuery)}&grouping=false`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const data = await response.json();
      
      // Handle the Solr response structure
      // Usually data.response.docs contains the results
      if (data && data.response && data.response.docs) {
        setSearchResults(data.response.docs);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      setError("Search Error: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = (doc) => {
    // Construct the playback URL
    // Using direct /web/timestamp/url pattern to avoid absolute redirects from viewForward
    // which cause CORS issues when running on a different port (localhost:5173 vs 8080).
    // doc.wayback_date is expected to be in YYYYMMDDHHMMSS format.
    const playbackUrl = `/solrwayback/services/web/${doc.wayback_date}/${doc.url}`;
    getPlaybackFunction(playbackUrl);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>SolrWayback React Playback w/ Search</h1>
      
      {/* Search Section */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search URL or keywords..."
            style={{ flex: 1, padding: '8px' }}
          />
          <button type="submit" disabled={searching} style={{ padding: '8px 16px' }}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Results List */}
        {searchResults.length > 0 && (
          <div style={{ width: '300px', flexShrink: 0, maxHeight: '600px', overflowY: 'auto', borderRight: '1px solid #ccc', paddingRight: '10px' }}>
            <h3>Results ({searchResults.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {searchResults.map((doc, idx) => (
                <li key={idx} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', cursor: 'pointer', backgroundColor: '#fff' }} onClick={() => handleResultClick(doc)}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', wordBreak: 'break-all' }}>{doc.url}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{doc.crawl_date || doc.wayback_date}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{doc.content_type}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Playback Viewer */}
        <div style={{ flex: 1 }}>
          {loading && <div>Loading playback...</div>}
          
          {playbackData ? (
            <div style={{ border: '1px solid #ccc', padding: '10px' }}>
              <h3>Playback View</h3>
              <div style={{ marginBottom: '10px', fontSize: 'small', color: '#555' }}>
                 Base URL: {playbackData.baseUrl}
              </div>
              <PlaybackViewer 
                htmlContent={playbackData.html} 
                baseUrl={playbackData.baseUrl} 
              />
            </div>
          ) : (
            !loading && <div style={{ padding: '20px', color: '#777' }}>Select a search result to view playback</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
