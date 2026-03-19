import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PlaybackViewer from "../PlaybackViewer";
import { toaster, Toaster } from "../src/components/ui/toaster";
import {epochToWaybackNumber, getSearchUrl, getTimeJumpToastDescription} from "../utils/util.ts";
import { usePersistentStore } from "../store/usePersistentStore.ts";

interface PlaybackData {
  html: string;
  baseUrl: string;
}

const PlaybackPage = () => {
  const [searchParams] = useSearchParams();
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [divergentPageResources, setDivergentPageResources] = useState(null);

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
      setPlaybackData({ html: htmlText, baseUrl: finalUrl });
    } catch (err: any) {
      toaster.create({
        title: "Page not found",
        description: "",
        type: "error",
        closable: true,
        duration: 5000,
      })

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
      const pageCrawlDate = data?.pageCrawlDate ?? null;
      const pageUrl = data?.pageUrl ?? null;
      // console.log(pageUrl, pageCrawlDate, data)
      const baseCrawlTime = usePersistentStore.getState().baseCrawlTime;
      setDivergentPageResources(data);
      if (setBaseDate) {
        usePersistentStore.getState().setBaseCrawlTime(pageCrawlDate)
        usePersistentStore.getState().setBaseUrl(pageUrl)
      }
      if (!setBaseDate && pageCrawlDate !== baseCrawlTime) {
        const description = getTimeJumpToastDescription(pageCrawlDate, baseCrawlTime);
        toaster.create({
          title: "Time jump detected!",
          description: description,
          type: "error",
          closable: true,
          duration: 3000,
        });
      }
    } catch (err) {
      console.error("Error fetching timestamps:", err);
    }
  };

  const getDivergentResourcesFromView = async (href: string) => {
    const searchUrl = getSearchUrl(href);
    if (!searchUrl) return;
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

  // On mount, read URL params and trigger playback
  useEffect(() => {
    const waybackDate = searchParams.get("wayback_date");
    const url = searchParams.get("url");
    const sourceFilePath = searchParams.get("source_file_path");
    const offset = searchParams.get("offset");
    if (waybackDate && url) {
      const playbackUrl = `/solrwayback/services/web/${waybackDate}/${url}`;
      getPlaybackFunction(playbackUrl);
    }

    if (sourceFilePath && offset) {
      getDivergentResources(sourceFilePath, Number(offset), true);
    }
  }, []);

  // Subscribe to Zustand store: navigate to latest selected node from Overview
  useEffect(() => {
    const unsubscribe = usePersistentStore.subscribe((state, prevState) => {
      if (state.nodes.length === 0) return;
      if (state.nodes.length === prevState.nodes.length) return;
      const latest = state.nodes[state.nodes.length - 1];
      const baseCrawl = state.baseCrawlTime;
      const newDate = epochToWaybackNumber(baseCrawl)
      // const baseCrawl = state.baseCrawlTime
      if (!latest.url) return;
      const playbackUrl = `/solrwayback/services/web/${newDate}/${latest.url}`;
      getPlaybackFunction(playbackUrl, true);
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toaster />
      {/*{loading && <div style={{ padding: "20px" }}>Loading playback...</div>}*/}
      {error && <div style={{ padding: "20px", color: "red" }}>{error}</div>}
      {playbackData ? (
        <div style={{ flex: 1 }}>
          {/*<div style={{ padding: "4px 10px", fontSize: "12px", color: "#666" }}>*/}
          {/*  {playbackData.baseUrl}*/}
          {/*</div>*/}
          <PlaybackViewer
            getPlaybackFunction={getPlaybackFunction}
            htmlContent={playbackData.html}
            baseUrl={playbackData.baseUrl}
            pageResources={divergentPageResources}
          />

        </div>
      ) : (
        !loading && (
          <div style={{ padding: "20px", color: "#777" }}>
            No playback data. Open this page from a search result.
          </div>
        )
      )}
    </div>
  );
};

export default PlaybackPage;
