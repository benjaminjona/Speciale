import React, { useEffect, useRef, useCallback, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { NodeBorderProgram } from "@sigma/node-border";
import { NodeSquareProgram } from "@sigma/node-square";
import { usePersistentStore } from "../store/usePersistentStore";
import { stripWww, proxyUrl, isExternalNode, fmtWayback } from "../utils/util";
import { DomainEntry, TreeLink } from "../types";
import { COLORS, fadedColor, disabledColor, unvisitedBorder, unvisitedBorderSize } from "./graphColors";
import VersionsPanel, { VersionsPanelData } from "./VersionsPanel";
import TimeFilter from "./TimeFilter";
import GraphLegend from "./GraphLegend";

interface SigmaGraphProps {
  treeData: TreeLink;
  domain?: string;
  data?: DomainEntry[];
  onClear?: () => void;
}
const Y_GAP = 0.6;

const SigmaGraph: React.FC<SigmaGraphProps> = ({ treeData, domain, data, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataMap = useRef<Map<string, TreeLink>>(new Map());
  const rawVersionMap = useRef<Map<string, DomainEntry[]>>(new Map());
  const graphRef = useRef<Graph>(new Graph({ type: "directed" }));
  const timeRangeRef = useRef<[number, number]>([0, 0]);
  const rendererRef = useRef<Sigma | null>(null);
  const currentNodeRef = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const processNodeRef = useRef<((nodeUrl: string, depth: number, force?: boolean) => void) | null>(null);
  const skipExpansionRef = useRef(false);
  const nodes = usePersistentStore((state) => state.nodes);
  const baseCrawlTime = usePersistentStore((state) => state.baseCrawlTime);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [versionsPanel, setVersionsPanel] = useState<VersionsPanelData | null>(null);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);
  const [timeBounds, setTimeBounds] = useState<[number, number]>([0, 0]);

  // Keep timeRangeRef in sync so processNode (inside the treeData effect) can read it
  useEffect(() => { timeRangeRef.current = timeRange; }, [timeRange]);

  // Initialise time bounds from data
  useEffect(() => {
    if (!data?.length) return;
    const timestamps = data.map(e => e.wayback_date).filter(Boolean);
    if (!timestamps.length) return;
    const minTs = timestamps.reduce((a, b) => Math.min(a, b));
    const maxTs = timestamps.reduce((a, b) => Math.max(a, b));
    if (minTs === maxTs) return;
    setTimeBounds([minTs, maxTs]);
    setTimeRange([minTs, maxTs]);
  }, [data]);

  // Build URL → sorted-versions lookup whenever raw data changes
  useEffect(() => {
    const map = new Map<string, DomainEntry[]>();
    if (data) {
      for (const entry of data) {
        const key = stripWww(entry.url);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry);
      }
      // Sort each bucket ascending by wayback_date
      for (const bucket of map.values()) {
        bucket.sort((a, b) => a.wayback_date - b.wayback_date);
      }
    }
    rawVersionMap.current = map;
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || !treeData) return;

    const graph = graphRef.current;
    graph.clear();
    dataMap.current.clear();

    const mapData = (item: TreeLink) => {
      const url = item.url;
      dataMap.current.set(url, item);
      if (Array.isArray(item.links)) item.links.forEach(mapData);
    };
    mapData(treeData);

    // Pre-compute total descendant count for each node (recursive)
    const descendantCount = new Map<string, number>();
    const countDescendants = (item: TreeLink): number => {
      const url =  item.url;
      if (descendantCount.has(url)) return descendantCount.get(url)!;
      let count = 0;
      if (Array.isArray(item.links)) {
        for (const child of item.links) {
          count += 1 + countDescendants(child);
        }
      }
      descendantCount.set(url, count);
      return count;
    };
    countDescendants(treeData);

    const maxLinks = 1;

    // Returns a faded version of defaultColor if the URL falls outside the active time interval
    const timeFilteredColor = (url: string, defaultColor: string): string => {
      const [lo, hi] = timeRangeRef.current;
      if (lo === 0 && hi === 0) return defaultColor;
      const ts = dataMap.current.get(url)?.wayback_date ?? 0;
      if (ts !== 0 && (ts < lo || ts > hi)) return disabledColor(defaultColor);
      return defaultColor;
    };
    const isInTimeRange = (ts: number): boolean => {
      const [lo, hi] = timeRangeRef.current;
      return (lo === 0 && hi === 0) || ts === 0 || (ts >= lo && ts <= hi);
    };

    const processNode = (nodeUrl: string, depth: number, force: boolean = false) => {
      const item = dataMap.current.get(nodeUrl);
      if (!item || !Array.isArray(item.links)) return;

      const linkCount = item.links.length;

      const firstChildUrl = item.links[0]?.url;
      if (force && firstChildUrl && graph.hasNode(firstChildUrl)) {
        const removeRecursive = (url: string) => {
          const nodeData = dataMap.current.get(url);
          if (nodeData && Array.isArray(nodeData.links)) {
            nodeData.links.forEach((child: any) => {
              const url = child.url;
              if (graph.hasNode(url)) {
                removeRecursive(url);
                graph.dropNode(url);
              }
            });
          }
        };
        removeRecursive(nodeUrl);
        const desc = descendantCount.get(nodeUrl) || 0;
        const visitedSet = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
        const isVis = visitedSet.has(nodeUrl);
        const nodeIsExternal = graph.getNodeAttribute(nodeUrl, "isExternal");

        if (!nodeIsExternal) {
          graph.setNodeAttribute(nodeUrl, "color", timeFilteredColor(nodeUrl, linkCount > 0 ? COLORS.expandable : COLORS.leaf));
        }
        const nodeTs = dataMap.current.get(nodeUrl)?.wayback_date ?? 0;
        const nodeInRange = isInTimeRange(nodeTs);
        graph.setNodeAttribute(nodeUrl, "borderColor", isVis ? COLORS.visitedBorder : (nodeInRange ? unvisitedBorder(linkCount > 0) : fadedColor(COLORS.unvisitedBorder)));
        graph.setNodeAttribute(nodeUrl, "borderSize", isVis ? 0.3 : (nodeInRange ? unvisitedBorderSize(linkCount > 0) : 0.0001));
        graph.setNodeAttribute(nodeUrl, "label", linkCount > 0 ? `+${desc}` : "");
        return;
      }

      const shouldExpand = force || (linkCount > 0 && linkCount < maxLinks);

      if (shouldExpand) {
        const px = graph.getNodeAttribute(nodeUrl, "x");
        const py = graph.getNodeAttribute(nodeUrl, "y");
        const spread = 1.0 / Math.pow(depth + 1, 0.7);

        item.links.forEach((child: TreeLink, index: number) => {
          const childUrl = child.url;
          if (!childUrl || graph.hasNode(childUrl)) return;

          const childLinks = Array.isArray(child.links) ? child.links.length : 0;
          const totalDescendants = descendantCount.get(childUrl) || 0;
          const xOffset = item.links.length > 1
            ? (index / (item.links.length - 1) - 0.5) * spread
            : 0;

          const visitedNow = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
          const isVisited = visitedNow.has(childUrl);
          const parentVisited = visitedNow.has(nodeUrl);
          const edgeHighlighted = isVisited && parentVisited;
          const external = isExternalNode(childUrl, domain);
          const baseColor = external ? "#FFD700" : (childLinks > 0 ? COLORS.expandable : COLORS.leaf);
          const childInRange = isInTimeRange(child.wayback_date ?? 0);
          graph.addNode(childUrl, {
            x: px + xOffset,
            y: py - Y_GAP,
            size: Math.max(10, Math.min(3 + Math.sqrt(totalDescendants) * 0.8, 50)),
            borderColor: isVisited ? COLORS.visitedBorder : (childInRange ? unvisitedBorder(childLinks > 0) : fadedColor(COLORS.unvisitedBorder)),
            borderSize: isVisited ? 0.3 : (childInRange ? unvisitedBorderSize(childLinks > 0) : 0.0001),
            color: external ? baseColor : timeFilteredColor(childUrl, baseColor),
            type: external ? "square" : "circle",
            isExternal: external,
            label: childLinks > 0 ? `+${totalDescendants}` : "",
            url: child.url
          });

          graph.addEdge(nodeUrl, childUrl, {
            size: edgeHighlighted ? 2.5 : 1,
            color: edgeHighlighted ? COLORS.edgeVisited : COLORS.edgeUnvisited,
          });

          if (childLinks > 0 && childLinks < maxLinks) {
            processNode(childUrl, depth + 1, false);
          }
        });
        if (!graph.getNodeAttribute(nodeUrl, "isExternal")) {
          graph.setNodeAttribute(nodeUrl, "color", timeFilteredColor(nodeUrl, linkCount > 0 ? COLORS.expandable : COLORS.leaf));
        }
        graph.setNodeAttribute(nodeUrl, "label", "");
      }
    };

    processNodeRef.current = processNode;

    const rootUrl = treeData.url;
    const rootLinks = Array.isArray(treeData.links) ? treeData.links.length : 0;
    const rootDescendants = descendantCount.get(rootUrl) || 0;
    const rootVisited = usePersistentStore.getState().nodes.some((n) => n.url === rootUrl);
    const rootExternal = isExternalNode(rootUrl, domain);
    graph.addNode(rootUrl, {
      x: 0,
      y: 0,
      size: Math.max(10, Math.min(3 + Math.sqrt(rootDescendants) * 0.8, 50)),
      color: rootExternal ? "#FFD700" : timeFilteredColor(rootUrl, rootLinks > 0 ? COLORS.expandable : COLORS.leaf),
      type: rootExternal ? "square" : "circle",
      isExternal: rootExternal,
      borderColor: rootVisited ? COLORS.visitedBorder : unvisitedBorder(rootLinks > 0),
      borderSize: rootVisited ? 0.3 : unvisitedBorderSize(rootLinks > 0),
      label: rootLinks > 0 ? `+${rootDescendants}` : "",
      url: treeData.url
    });

    processNode(rootUrl, 0, true);

    if (rendererRef.current) {
      rendererRef.current.kill();
      rendererRef.current = null;
    }

    const renderer = new Sigma(graph, containerRef.current, {
      nodeProgramClasses: {
        circle: NodeBorderProgram,
        square: NodeSquareProgram,
      },
      renderLabels: true,
      labelSize: 11,
      labelWeight: "bold",
      labelColor: { color: "#1e293b" },
      zIndex: true,
      defaultDrawNodeLabel: (context: CanvasRenderingContext2D, data, settings) => {
        if (!data.label) return;
        const size = (settings.labelSize as number) ?? 11;
        const weight = (settings.labelWeight as string) ?? "bold";
        const font = (settings.labelFont as string) ?? "sans-serif";
        context.font = `${weight} ${size}px ${font}`;
        context.fillStyle = ((settings.labelColor as { color: string })?.color) ?? "#1e293b";
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(data.label, data.x, data.y + data.size + 4);
      },
      // Provide a fixed zooming ratio for double clicks so it does not zoom at all
      doubleClickZoomingRatio: 1,
    });

    renderer.on("enterNode", ({ node }) => {
      const url = graph.getNodeAttribute(node, "url");
      const nodeData = dataMap.current.get(url);
      if (!tooltipRef.current) return;

      const currentTs = nodeData?.wayback_date ?? 0;
      const formattedCurrent = currentTs ? fmtWayback(currentTs) : null;
      const allVersions = rawVersionMap.current.get(stripWww(url)) ?? [];
      const otherCount = allVersions.length > 1 ? allVersions.length - 1 : 0;

      // Thumbnail: scale a 1024×640 iframe down to 280×175px
      const thumbSrc = currentTs ? proxyUrl(currentTs, url) : null;
      const thumbHtml = thumbSrc ? `
        <div style="margin-top:8px; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; width:280px; height:175px; position:relative; background:#f8fafc;">
          <iframe
            src="${thumbSrc}"
            style="width:1024px; height:640px; transform:scale(0.2734375); transform-origin:top left; pointer-events:none; border:none; display:block;"
            sandbox="allow-scripts allow-same-origin"
            scrolling="no"
            loading="lazy"
            title="Page preview"
          ></iframe>
          <div style="position:absolute;inset:0;pointer-events:none;"></div>
        </div>` : "";

      tooltipRef.current.innerHTML = `
        <div style="font-size:12px; font-weight:600; color:#0f172a; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; word-break:break-all;">
          ${url}
        </div>
        ${formattedCurrent ? `
        <div style="color:#334155; font-size:12px; margin-bottom:5px;">
          <span style="font-weight:500;">CRAWL DATE: ${formattedCurrent}</span>
        </div>` : ""}
        ${thumbHtml}
        ${otherCount > 0 ? `
        <div style="font-size:11px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:5px; margin-top:8px;">
          ${otherCount} other version${otherCount !== 1 ? "s" : ""} exist${otherCount === 1 ? "s" : ""}<br/>
          <span style="color:#94a3b8; font-style:italic;">Right-click to see all versions</span>
        </div>` : ""}
      `;
      tooltipRef.current.style.display = "block";
    });

    renderer.on("leaveNode", () => {
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    });

    renderer.on("rightClickNode", (e) => {
      const url = graph.getNodeAttribute(e.node, "url");
      const nodeData = dataMap.current.get(url);
      const currentTs = nodeData?.wayback_date ?? 0;
      const allVersions = rawVersionMap.current.get(stripWww(url)) ?? [];
      if (allVersions.length > 0) {
        setVersionsPanel({ url, versions: allVersions, currentTs });
      }
    });

    // Suppress browser context menu on the graph canvas
    containerRef.current?.addEventListener("contextmenu", (ev) => ev.preventDefault());


    // Prevent Sigma's built-in double-click zoom
    renderer.on("doubleClickNode", (e) => {
      e.preventSigmaDefault();
      // Cancel any pending single-click action
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const node = e.node;
      const url = graph.getNodeAttribute(node, "url") || node;

      // Demote previous current node
      const prevCurrent = currentNodeRef.current;
      if (prevCurrent && prevCurrent !== node && graph.hasNode(prevCurrent)) {
        const prevData = dataMap.current.get(prevCurrent);
        const prevHasLinks = Array.isArray(prevData?.links) && prevData!.links.length > 0;
        graph.setNodeAttribute(prevCurrent, "color", prevHasLinks ? COLORS.expandable : COLORS.leaf);
        graph.setNodeAttribute(prevCurrent, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(prevCurrent, "borderSize", 0.3);
        graph.setNodeAttribute(prevCurrent, "zIndex", 0);
      }

      currentNodeRef.current = url;
      // Skip expansion in the nodes useEffect – double-click only marks visited
      skipExpansionRef.current = true;
      usePersistentStore.getState().addNode({ url });
    });

    // Also prevent double click zoom on the stage (background)
    renderer.on("doubleClickStage", (e) => {
      e.preventSigmaDefault();
    });

    renderer.on("clickNode", ({ node }) => {
      // Debounce: cancel if a second click arrives within 250ms (i.e. it's a double-click)
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        return;
      }

      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;

        const depth = Math.round(-graph.getNodeAttribute(node, "y") / Y_GAP);
        
        // We only expand/collapse the node. We don't mark it as visited (that happens on double click).
        processNode(node, depth, true);

        // If this happens to be the currently active node, make sure we retain its current styling
        // because processNode might reset it.
        const url = graph.getNodeAttribute(node, "url") || node;
        if (currentNodeRef.current === url) {
          graph.setNodeAttribute(node, "color", COLORS.current);
          graph.setNodeAttribute(node, "borderColor", COLORS.visitedBorder);
          graph.setNodeAttribute(node, "borderSize", 0.3);
          graph.setNodeAttribute(node, "zIndex", 10);
        }
        rendererRef.current?.refresh();
      }, 250);
    });

    // Restore visited state for previously visited nodes (persisted in localStorage)
    const visitedUrls = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
    graph.forEachNode((nodeUrl) => {
      if (visitedUrls.has(nodeUrl)) {
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.3);
      }
    });
    graph.forEachEdge((edge, _attrs, source, target) => {
      if (visitedUrls.has(source) && visitedUrls.has(target)) {
        graph.setEdgeAttribute(edge, "color", COLORS.edgeVisited);
        graph.setEdgeAttribute(edge, "size", 2.5);
      }
    });

    rendererRef.current = renderer;

    const container = containerRef.current!;
    const onMouseMove = (e: MouseEvent) => {

      if (tooltipRef.current && tooltipRef.current.style.display !== "none") {
        const rect = container.getBoundingClientRect();
        tooltipRef.current.style.left = `${e.clientX - rect.left + 14}px`;
        tooltipRef.current.style.top = `${e.clientY - rect.top - 36}px`;
      }
    };
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current); // ← add this
      container.removeEventListener("mousemove", onMouseMove);
      renderer.kill();
      rendererRef.current = null;
    };
  }, [treeData]);

  // Re-apply visited colours whenever nodes change (e.g. updated by PlaybackViewer)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || graph.order === 0) return;

    const visitedUrls = new Set(nodes.map((n) => n.url));
    const prevCurrent = currentNodeRef.current;
    currentNodeRef.current = nodes.length > 0 ? nodes[nodes.length - 1].url : null;

    // Demote the previous current node ONCE before iterating – doing this inside
    // forEachNode would re-demote it on every iteration where nodeUrl !== prevCurrent,
    // which would overwrite the "current" styling applied earlier in the loop.
    if (prevCurrent && prevCurrent !== currentNodeRef.current && graph.hasNode(prevCurrent)) {
      const prevData = dataMap.current.get(prevCurrent);
      const prevHasLinks = Array.isArray(prevData?.links) && prevData!.links.length > 0;
      graph.setNodeAttribute(prevCurrent, "color", prevHasLinks ? COLORS.expandable : COLORS.leaf);
      graph.setNodeAttribute(prevCurrent, "borderColor", COLORS.visitedBorder);
      graph.setNodeAttribute(prevCurrent, "borderSize", 0.3);
      graph.setNodeAttribute(prevCurrent, "zIndex", 0);
    }

    graph.forEachNode((nodeUrl) => {
      const isCurrent = nodeUrl === currentNodeRef.current;

      if (isCurrent) {
        graph.setNodeAttribute(nodeUrl, "color", COLORS.current);
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.3);
        graph.setNodeAttribute(nodeUrl, "zIndex", 10);
        return;
      }
      if (visitedUrls.has(nodeUrl)) {
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.3);
      } else {
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.unvisitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.0001);
      }
    });

    // Dynamically expand the current node (skip if click already handled it).
    // Only expand – never toggle/collapse – from this path.
    const currentUrl = currentNodeRef.current;
    if (currentUrl && processNodeRef.current && !skipExpansionRef.current) {
      // If the current node isn't in the graph yet (e.g. navigation from PlaybackViewer),
      // try expanding the previous current node (its parent) to bring it into the graph.
      if (!graph.hasNode(currentUrl) && prevCurrent && graph.hasNode(prevCurrent)) {
        const prevItem = dataMap.current.get(prevCurrent);
        const firstPrevChild = Array.isArray(prevItem?.links) ? prevItem!.links[0]?.url : null;
        const prevAlreadyExpanded = !!firstPrevChild && graph.hasNode(firstPrevChild);
        if (!prevAlreadyExpanded) {
          const depth = Math.round(-graph.getNodeAttribute(prevCurrent, "y") / Y_GAP);
          processNodeRef.current(prevCurrent, depth, true);
        }
      }

      if (graph.hasNode(currentUrl)) {
        // Expand current node's children if not already expanded
        const item = dataMap.current.get(currentUrl);
        const firstChildUrl = Array.isArray(item?.links) ? item!.links[0]?.url : null;
        const alreadyExpanded = !!firstChildUrl && graph.hasNode(firstChildUrl);
        if (!alreadyExpanded) {
          const depth = Math.round(-graph.getNodeAttribute(currentUrl, "y") / Y_GAP);          
          processNodeRef.current(currentUrl, depth, true);
        }
        // Always re-apply current styling (processNode may have overridden color)
        graph.setNodeAttribute(currentUrl, "color", COLORS.current);
        graph.setNodeAttribute(currentUrl, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(currentUrl, "borderSize", 0.3);
        graph.setNodeAttribute(currentUrl, "zIndex", 10);
      }
    }
    skipExpansionRef.current = false;

    graph.forEachEdge((edge, _attrs, source, target) => {
      if (visitedUrls.has(source) && visitedUrls.has(target)) {
        graph.setEdgeAttribute(edge, "color", COLORS.edgeVisited);
        graph.setEdgeAttribute(edge, "size", 2.5);
      } else {
        graph.setEdgeAttribute(edge, "color", COLORS.edgeUnvisited);
        graph.setEdgeAttribute(edge, "size", 1);
      }
    });

    // Restore every non-current node's colour, fading those outside the time interval.
    // Single pass: compute natural colour then blend toward background if out-of-range.
    const [minTs, maxTs] = timeRange;
    const timeActive = !(minTs === 0 && maxTs === 0) && minTs !== maxTs;
    graph.forEachNode((nodeUrl) => {
      if (nodeUrl === currentNodeRef.current) return;
      const isExternal = graph.getNodeAttribute(nodeUrl, "isExternal");
      const item = dataMap.current.get(nodeUrl);
      const ts = item?.wayback_date ?? 0;
      const inRange = !timeActive || ts === 0 || (ts >= minTs && ts <= maxTs);
      const naturalColor = isExternal ? "#FFD700" : (Array.isArray(item?.links) && item!.links.length > 0 ? COLORS.expandable : COLORS.leaf);
      const hasLinks = !isExternal && Array.isArray(item?.links) && item!.links.length > 0;
      const isVisitedNode = visitedUrls.has(nodeUrl);
      graph.setNodeAttribute(nodeUrl, "color", inRange ? naturalColor : disabledColor(naturalColor));
      if (inRange && !isVisitedNode) {
        graph.setNodeAttribute(nodeUrl, "borderColor", hasLinks ? COLORS.unvisitedBorder : COLORS.leafBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", hasLinks ? 0.0001 : 0.25);
      } else if (!inRange) {
        graph.setNodeAttribute(nodeUrl, "borderColor", fadedColor(COLORS.unvisitedBorder));
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.0001);
      }
    });

    rendererRef.current?.refresh();
  }, [nodes, timeRange]);

  const handleZoomIn = useCallback(() => {
    const camera = rendererRef.current?.getCamera();
    if (camera) camera.animatedZoom({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const camera = rendererRef.current?.getCamera();
    if (camera) camera.animatedUnzoom({ duration: 200 });
  }, []);

  const handleResetZoom = useCallback(() => {
    const camera = rendererRef.current?.getCamera();
    if (camera) camera.animatedReset({ duration: 300 });
  }, []);

  const btnStyle: React.CSSProperties = {
    width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff",
    cursor: "pointer", fontSize: "22px", fontWeight: 700, color: "#475569",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{height:"100%"}}>
      {/* Domain header bar */}
      <div style={{
        padding: "6px 14px", 
        backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0",
        display: "flex", gap: "8px", flexWrap: "wrap",
      }}>
      {domain && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Domain</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{domain}</span>
        </div>
      )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderLeft: "1px solid #cbd5e1" }} />
      {baseCrawlTime && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Reference date</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{new Date(baseCrawlTime).toLocaleString()}</span>
        </div>
      )}
        {onClear && (
          <button
            onClick={onClear}
            title="Clear all saved data and reload"
            style={{
              marginLeft: "auto",
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600,
              color: "#b91c1c", backgroundColor: "#fff1f2",
              border: "1px solid #fca5a5", borderRadius: "7px",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fee2e2";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#f87171";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff1f2";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5";
            }}
          >&#8634; Clear &amp; Reset</button>
        )}
        </div>

      <div style={{ height: "100%", position: "relative" }}>
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", backgroundColor: "#F0F4FF", overflow: "hidden" }}
        />

        {/* URL tooltip on hover */}
        <div
          ref={tooltipRef}
          style={{
            display: "none",
            position: "absolute",
            pointerEvents: "none",
            backgroundColor: "#ffffff",
            color: "#1e293b",
            padding: "8px 10px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            maxWidth: "320px",
            wordBreak: "break-word",
            zIndex: 100,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          }}
        />

        <GraphLegend />
        <TimeFilter timeBounds={timeBounds} timeRange={timeRange} setTimeRange={setTimeRange} />

        {/* Zoom controls - bottom right */}
        <div style={{
          position: "absolute", bottom: "64px", right: "14px",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          <button onClick={handleZoomIn} style={btnStyle} title="Zoom in">+</button>
          <button onClick={handleZoomOut} style={btnStyle} title="Zoom out">&minus;</button>
          <button onClick={handleResetZoom} style={{ ...btnStyle, fontSize: "12px" }} title="Reset view">&#8634;</button>
        </div>
      </div>

      <VersionsPanel panel={versionsPanel} timeRange={timeRange} onClose={() => setVersionsPanel(null)} />
    </div>
  );
};

export default SigmaGraph;