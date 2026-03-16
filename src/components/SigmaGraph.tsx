import React, { useEffect, useRef, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { NodeBorderProgram } from "@sigma/node-border";
import { usePersistentStore } from "../store/usePersistentStore.ts";

export type TreeLink = {
  id: string;
  url: string;
  wayback_date: number;
  links: TreeLink[] | any;
};

interface SigmaGraphProps {
  treeData: TreeLink;
  domain?: string;
}

// Brand navy #002E70.  Unvisited nodes are light; visited nodes fill with navy.
const COLORS = {
  expandable:      "#5B9BD5", // medium blue      – has children
  leaf:            "#E8F2FB", // near-white blue  – no children
  current:         "#6f1078", // vivid purple     – YOU ARE HERE
  visitedFill:     "#b76fc7", // soft purple      – visited node fill
  visitedBorder:   "#ca0bf5", // bright purple   – ring on any visited node
  unvisitedBorder: "#C8DCF0", // muted blue-grey – hairline border on unvisited
  edgeVisited:     "#ca0bf5", // brand purple    – traversed path
  edgeUnvisited:   "#C8DCF0", // pale blue       – unvisited edge
};
// ────────────────────────────────────────────────────────────────────────────

const SigmaGraph: React.FC<SigmaGraphProps> = ({ treeData, domain }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataMap = useRef<Map<string, TreeLink>>(new Map());
  const graphRef = useRef<Graph>(new Graph({ type: "directed" }));
  const rendererRef = useRef<Sigma | null>(null);
  const currentNodeRef = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nodes = usePersistentStore((state) => state.nodes);

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

    const X_GAP = 0.6;
    const maxLinks = 1;

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
        graph.setNodeAttribute(nodeUrl, "color", COLORS.expandable);
        graph.setNodeAttribute(nodeUrl, "borderColor", isVis ? COLORS.visitedBorder : COLORS.unvisitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", isVis ? 0.3 : 0.0001);
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
          const yOffset = item.links.length > 1
            ? (index / (item.links.length - 1) - 0.5) * spread
            : 0;

          const visitedNow = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
          const isVisited = visitedNow.has(childUrl);
          const parentVisited = visitedNow.has(nodeUrl);
          const edgeHighlighted = isVisited && parentVisited;
          graph.addNode(childUrl, {
            x: px + X_GAP,
            y: py + yOffset,
            size: Math.max(10, Math.min(3 + Math.sqrt(totalDescendants) * 0.8, 50)),
            borderColor: isVisited ? COLORS.visitedBorder : COLORS.unvisitedBorder,
            borderSize: isVisited ? 0.3 : 0.0001,
            color: childLinks > 0 ? COLORS.expandable : COLORS.leaf,
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
        graph.setNodeAttribute(nodeUrl, "color", COLORS.expandable);
        graph.setNodeAttribute(nodeUrl, "label", "");
      }
    };

    const rootUrl = treeData.url;
    const rootLinks = Array.isArray(treeData.links) ? treeData.links.length : 0;
    const rootDescendants = descendantCount.get(rootUrl) || 0;
    const rootVisited = usePersistentStore.getState().nodes.some((n) => n.url === rootUrl);
    graph.addNode(rootUrl, {
      x: 0,
      y: 0.5,
      size: Math.max(10, Math.min(3 + Math.sqrt(rootDescendants) * 0.8, 50)),
      color: rootLinks > 0 ? COLORS.expandable : COLORS.leaf,
      borderColor: rootVisited ? COLORS.visitedBorder : COLORS.unvisitedBorder,
      borderSize: rootVisited ? 0.3 : 0.0001,
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
      },
      renderLabels: true,
      labelSize: 11,
      labelWeight: "bold",
      labelColor: { color: "#1e293b" },
      zIndex: true,
    });

    renderer.on("enterNode", ({ node }) => {
      const url = graph.getNodeAttribute(node, "url");
      if (tooltipRef.current) {
        tooltipRef.current.textContent = url;
        tooltipRef.current.style.display = "block";
      }
    });

    renderer.on("leaveNode", () => {
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    });

    renderer.on("clickNode", ({ node }) => {
      const url = graph.getNodeAttribute(node, "url") || node;
      // const nodeData = dataMap.current.get(node);
      // const wayback_date = nodeData?.wayback_date;
      usePersistentStore.getState().addNode({ url });

      // Demote previous current node back to its correct non-current colours
      const prevCurrent = currentNodeRef.current;
      if (prevCurrent && prevCurrent !== node && graph.hasNode(prevCurrent)) {
        graph.setNodeAttribute(prevCurrent, "color", COLORS.visitedFill);
        graph.setNodeAttribute(prevCurrent, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(prevCurrent, "borderSize", 0.3);
        graph.setNodeAttribute(prevCurrent, "zIndex", 0);
      }

      // Mark this node as current – float to top
      currentNodeRef.current = node;
      graph.setNodeAttribute(node, "color", COLORS.current);
      graph.setNodeAttribute(node, "borderColor", COLORS.visitedBorder);
      graph.setNodeAttribute(node, "borderSize", 0.3);
      graph.setNodeAttribute(node, "zIndex", 10);

      // Highlight edges along the visited path
      const visited = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
      graph.forEachEdge(node, (edge, _attrs, source, target) => {
        const other = source === node ? target : source;
        if (visited.has(other)) {
          graph.setEdgeAttribute(edge, "color", COLORS.edgeVisited);
          graph.setEdgeAttribute(edge, "size", 2.5);
        }
      });

      const depth = Math.round(graph.getNodeAttribute(node, "x") / X_GAP);
      processNode(node, depth, true);

      // Restore fill + top z-index after processNode
      graph.setNodeAttribute(node, "color", COLORS.current);
      graph.setNodeAttribute(node, "borderColor", COLORS.visitedBorder);
      graph.setNodeAttribute(node, "borderSize", 0.3);
      graph.setNodeAttribute(node, "zIndex", 10);
    });

    // Restore visited state for previously visited nodes (persisted in localStorage)
    const visitedUrls = new Set(usePersistentStore.getState().nodes.map((n) => n.url));
    graph.forEachNode((nodeUrl) => {
      if (visitedUrls.has(nodeUrl)) {
        graph.setNodeAttribute(nodeUrl, "color", COLORS.visitedFill);
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

    graph.forEachNode((nodeUrl) => {
      const isCurrent = nodeUrl === currentNodeRef.current;
      if (isCurrent) return; // keep current-node styling intact
      const nodeData = dataMap.current.get(nodeUrl);
      const hasLinks = Array.isArray(nodeData?.links) && nodeData!.links.length > 0;
      if (visitedUrls.has(nodeUrl)) {
        graph.setNodeAttribute(nodeUrl, "color", COLORS.visitedFill);
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.visitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.3);
      } else {
        graph.setNodeAttribute(nodeUrl, "color", hasLinks ? COLORS.expandable : COLORS.leaf);
        graph.setNodeAttribute(nodeUrl, "borderColor", COLORS.unvisitedBorder);
        graph.setNodeAttribute(nodeUrl, "borderSize", 0.0001);
      }
    });

    graph.forEachEdge((edge, _attrs, source, target) => {
      if (visitedUrls.has(source) && visitedUrls.has(target)) {
        graph.setEdgeAttribute(edge, "color", COLORS.edgeVisited);
        graph.setEdgeAttribute(edge, "size", 2.5);
      } else {
        graph.setEdgeAttribute(edge, "color", COLORS.edgeUnvisited);
        graph.setEdgeAttribute(edge, "size", 1);
      }
    });

    rendererRef.current?.refresh();
  }, [nodes]);

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
    <div style={{height:"100%", paddingBottom: "50px"}}>
      {/* Domain header bar */}
      {domain && (
        <div style={{
          padding: "6px 14px", marginBottom: "6px", borderRadius: "8px",
          backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Domain</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>{domain}</span>
        </div>
      )}

      <div style={{ height: "100%", position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#F0F4FF",
            borderRadius: "12px",
            border: "1px solid #C7D9F5",
            overflow: "hidden",
          }}
        />

        {/* URL tooltip on hover */}
        <div
          ref={tooltipRef}
          style={{
            display: "none",
            position: "absolute",
            pointerEvents: "none",
            backgroundColor: "rgba(15, 23, 42, 0.88)",
            color: "#f8fafc",
            padding: "4px 9px",
            borderRadius: "5px",
            fontSize: "11px",
            maxWidth: "300px",
            wordBreak: "break-all",
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        />

        {/* Legend – top-left */}
        <div style={{
          position: "absolute", top: "10px", left: "10px",
          backgroundColor: "rgba(255,255,255,0.93)",
          backdropFilter: "blur(6px)",
          border: "1px solid #C7D9F5",
          borderRadius: "8px",
          padding: "8px 10px",
          display: "flex", flexDirection: "column", gap: "5px",
          pointerEvents: "none",
          boxShadow: "0 1px 6px rgba(0,46,112,0.10)",
        }}>
          {([
            { color: COLORS.expandable, border: COLORS.unvisitedBorder, label: "Outgoing links" },
            { color: COLORS.leaf,       border: COLORS.unvisitedBorder, label: "No outgoing links" },
          ] as { color: string; border: string; label: string }[]).map(({ color, border, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{
                width: 11, height: 11, borderRadius: "50%",
                backgroundColor: color,
                border: `1.5px solid ${border}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>{label}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #E2E8F0", margin: "2px 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: COLORS.expandable, border: `2.5px solid ${COLORS.visitedBorder}`, flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>Visited</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: COLORS.current, border: `1.5px solid ${COLORS.visitedBorder}`, flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap" }}>You are here</span>
          </div>
        </div>

        {/* Zoom controls - bottom right */}
        <div style={{
          position: "absolute", bottom: "14px", right: "14px",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          <button onClick={handleZoomIn} style={btnStyle} title="Zoom in">+</button>
          <button onClick={handleZoomOut} style={btnStyle} title="Zoom out">&minus;</button>
          <button onClick={handleResetZoom} style={{ ...btnStyle, fontSize: "12px" }} title="Reset view">&#8634;</button>
        </div>
      </div>
    </div>
  );
};

export default SigmaGraph;