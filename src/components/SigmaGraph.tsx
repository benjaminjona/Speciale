import React, { useEffect, useRef, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { NodeBorderProgram } from "@sigma/node-border";
import { useSelectedNodes } from "../store/useSelectedNodes";

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

const SigmaGraph: React.FC<SigmaGraphProps> = ({ treeData, domain }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataMap = useRef<Map<string, TreeLink>>(new Map());
  const graphRef = useRef<Graph>(new Graph({ type: "directed" }));
  const rendererRef = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current || !treeData) return;

    const graph = graphRef.current;
    graph.clear();
    dataMap.current.clear();

    const mapData = (item: TreeLink) => {
      const id = item.id || item.url;
      dataMap.current.set(id, item);
      if (Array.isArray(item.links)) item.links.forEach(mapData);
    };
    mapData(treeData);

    // Pre-compute total descendant count for each node (recursive)
    const descendantCount = new Map<string, number>();
    const countDescendants = (item: TreeLink): number => {
      const id = item.id || item.url;
      if (descendantCount.has(id)) return descendantCount.get(id)!;
      let count = 0;
      if (Array.isArray(item.links)) {
        for (const child of item.links) {
          count += 1 + countDescendants(child);
        }
      }
      descendantCount.set(id, count);
      return count;
    };
    countDescendants(treeData);

    const X_GAP = 0.6;
    const maxLinks = 1;

    const processNode = (nodeId: string, depth: number, force: boolean = false) => {
      const item = dataMap.current.get(nodeId);
      if (!item || !Array.isArray(item.links)) return;

      const linkCount = item.links.length;

      const firstChildId = item.links[0]?.id || item.links[0]?.url;
      if (force && firstChildId && graph.hasNode(firstChildId)) {
        const removeRecursive = (id: string) => {
          const nodeData = dataMap.current.get(id);
          if (nodeData && Array.isArray(nodeData.links)) {
            nodeData.links.forEach((child: any) => {
              const cId = child.id || child.url;
              if (graph.hasNode(cId)) {
                removeRecursive(cId);
                graph.dropNode(cId);
              }
            });
          }
        };
        removeRecursive(nodeId);
        const desc = descendantCount.get(nodeId) || 0;
        graph.setNodeAttribute(nodeId, "color", linkCount > 0 ? "#6b6a6a" : "#cbd5e1");
        graph.setNodeAttribute(nodeId, "label", linkCount > 0 ? `+${desc}` : "");
        return;
      }

      const shouldExpand = force || (linkCount > 0 && linkCount < maxLinks);

      if (shouldExpand) {
        const px = graph.getNodeAttribute(nodeId, "x");
        const py = graph.getNodeAttribute(nodeId, "y");
        const spread = 1.0 / Math.pow(depth + 1, 0.7);

        item.links.forEach((child: TreeLink, index: number) => {
          const childId = child.id || child.url;
          if (!childId || graph.hasNode(childId)) return;

          const childLinks = Array.isArray(child.links) ? child.links.length : 0;
          const totalDescendants = descendantCount.get(childId) || 0;
          const yOffset = item.links.length > 1
            ? (index / (item.links.length - 1) - 0.5) * spread
            : 0;

          const isVisited = useSelectedNodes.getState().nodes.some((n) => n.id === childId);
          const parentVisited = useSelectedNodes.getState().nodes.some((n) => n.id === nodeId);
          const edgeGreen = isVisited && parentVisited;
          graph.addNode(childId, {
            x: px + X_GAP,
            y: py + yOffset,
            size: Math.min(3 + Math.sqrt(totalDescendants) * 0.8, 50),
            color: childLinks > 0 ? "#6b6a6a" : "#cbd5e1",
            borderColor: isVisited ? "#22c55e" : "#000000",
            borderSize: isVisited ? 0.5 : 0.1,
            label: childLinks > 0 ? `+${totalDescendants}` : "",
            url: child.url
          });

          graph.addEdge(nodeId, childId, {
            size: edgeGreen ? 2.5 : 1,
            color: edgeGreen ? "#22c55e" : "#cbd5e1",
          });

          if (childLinks > 0 && childLinks < maxLinks) {
            processNode(childId, depth + 1, false);
          }
        });

        graph.setNodeAttribute(nodeId, "label", "");
        graph.setNodeAttribute(nodeId, "color", "#cbd5e1");
      }
    };

    const rootId = treeData.id || treeData.url;
    graph.addNode(rootId, {
      x: 0,
      y: 0.5,
      size: 5,
      color: "#3b82f6",
      borderColor: "#000000",
      borderSize: 0.1,
      label: "",
      url: treeData.url
    });

    processNode(rootId, 0, true);

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
      graph.setNodeAttribute(node, "savedLabel", graph.getNodeAttribute(node, "label"));
      graph.setNodeAttribute(node, "label", url);
    });

    renderer.on("leaveNode", ({ node }) => {
      graph.setNodeAttribute(node, "label", graph.getNodeAttribute(node, "savedLabel") || "");
    });

    renderer.on("clickNode", ({ node }) => {
      const url = graph.getNodeAttribute(node, "url") || node;
      useSelectedNodes.getState().addNode({ id: node, url });

      // Highlight visited node in green
      graph.setNodeAttribute(node, "borderColor", "#22c55e");
      graph.setNodeAttribute(node, "borderSize", 0.5);

      // Color edges green between this node and any visited neighbour
      const visited = new Set(useSelectedNodes.getState().nodes.map((n) => n.id));
      graph.forEachEdge(node, (edge, _attrs, source, target) => {
        const other = source === node ? target : source;
        if (visited.has(other)) {
          graph.setEdgeAttribute(edge, "color", "#22c55e");
          graph.setEdgeAttribute(edge, "size", 2.5);
        }
      });

      const depth = Math.round(graph.getNodeAttribute(node, "x") / X_GAP);
      processNode(node, depth, true);
    });

    // Restore green borders and edges for previously visited nodes (persisted in localStorage)
    const visitedIds = new Set(useSelectedNodes.getState().nodes.map((n) => n.id));
    graph.forEachNode((nodeId) => {
      if (visitedIds.has(nodeId)) {
        graph.setNodeAttribute(nodeId, "borderColor", "#22c55e");
        graph.setNodeAttribute(nodeId, "borderSize", 0.5);
      }
    });
    graph.forEachEdge((edge, _attrs, source, target) => {
      if (visitedIds.has(source) && visitedIds.has(target)) {
        graph.setEdgeAttribute(edge, "color", "#22c55e");
        graph.setEdgeAttribute(edge, "size", 2.5);
      }
    });

    rendererRef.current = renderer;

    return () => {
      renderer.kill();
      rendererRef.current = null;
    };
  }, [treeData]);

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
    width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff",
    cursor: "pointer", fontSize: "16px", fontWeight: 700, color: "#475569",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  };

  return (
    <div style={{ position: "relative"}}>
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

      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "800px",
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        />

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