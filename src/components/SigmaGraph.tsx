import React, { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";

export type TreeLink = {
  id: string;
  url: string;
  wayback_date: number;
  links: TreeLink[] | any;
};

interface SigmaGraphProps {
  treeData: TreeLink;
}

const SigmaGraph: React.FC<SigmaGraphProps> = ({ treeData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataMap = useRef<Map<string, TreeLink>>(new Map());
  const graphRef = useRef<Graph>(new Graph({ type: "directed" }));

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

    const X_GAP = 0.6;

    const processNode = (nodeId: string, depth: number, force: boolean = false) => {
      const item = dataMap.current.get(nodeId);
      if (!item || !Array.isArray(item.links)) return;

      const linkCount = item.links.length;

      // COLLAPSE LOGIK: Hvis vi klikker på en node der allerede ER udfoldet
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
        // Reset label og farve til "expandable" tilstand
        graph.setNodeAttribute(nodeId, "color", linkCount > 20 ? "#fbbf24" : "#3b82f6");
        graph.setNodeAttribute(nodeId, "label", linkCount > 20 ? `+${linkCount}` : "");
        return;
      }

      // EXPAND LOGIK
      const shouldExpand = force || (linkCount > 0 && linkCount < 20);

      if (shouldExpand) {
        const px = graph.getNodeAttribute(nodeId, "x");
        const py = graph.getNodeAttribute(nodeId, "y");
        const spread = 1.0 / Math.pow(depth + 1, 0.7);

        item.links.forEach((child: TreeLink, index: number) => {
          const childId = child.id || child.url;
          if (!childId || graph.hasNode(childId)) return;

          const childLinks = Array.isArray(child.links) ? child.links.length : 0;
          const yOffset = item.links.length > 1
            ? (index / (item.links.length - 1) - 0.5) * spread
            : 0;

          graph.addNode(childId, {
            x: px + X_GAP,
            y: py + yOffset,
            size: 5 + Math.sqrt(childLinks),
            color: childLinks > 20 ? "#fbbf24" : "#3b82f6",
            label: childLinks > 20 ? `+${childLinks}` : "",
            url: child.url
          });

          graph.addEdge(nodeId, childId, { size: 1, color: "#cbd5e1" });

          // Auto-expand rekursivt for små grene
          if (childLinks > 0 && childLinks < 20) {
            processNode(childId, depth + 1, false);
          }
        });

        // Opdater forældre-node visuelt
        graph.setNodeAttribute(nodeId, "label", "");
        graph.setNodeAttribute(nodeId, "color", "#3b82f6");
      }
    };

    // Initialize root
    const rootId = treeData.id || treeData.url;
    graph.addNode(rootId, { x: 0, y: 0.5, size: 10, color: "#3b82f6", label: "", url: treeData.url });
    processNode(rootId, 0, true);

    const renderer = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelSize: 11,
      labelWeight: "bold",
      labelColor: { color: "#1e293b" },
      zIndex: true,
    });

    // Hover handler: Vis URL som label
    renderer.on("enterNode", ({ node }) => {
      const url = graph.getNodeAttribute(node, "url");
      graph.setNodeAttribute(node, "savedLabel", graph.getNodeAttribute(node, "label"));
      graph.setNodeAttribute(node, "label", url);
    });

    renderer.on("leaveNode", ({ node }) => {
      graph.setNodeAttribute(node, "label", graph.getNodeAttribute(node, "savedLabel") || "");
    });

    // Click handler: Expand eller Collapse
    renderer.on("clickNode", ({ node }) => {
      const depth = Math.round(graph.getNodeAttribute(node, "x") / X_GAP);
      processNode(node, depth, true);
    });

    return () => renderer.kill();
  }, [treeData]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "800px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden"
      }}
    />
  );
};

export default SigmaGraph;