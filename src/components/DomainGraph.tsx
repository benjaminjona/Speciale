import { useState, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { TreeLink } from "../utils/treeUtils.ts";

export const DomainGraph = ({ treeData }: { treeData: TreeLink }) => {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([treeData?.url]));

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Logic to filter the tree based on the expanded state
  const getVisibleGraph = useCallback((root: TreeLink) => {
    const nodes: any[] = [];
    const links: any[] = [];
    const visited = new Set();

    const traverse = (node: TreeLink) => {
      if (!node || !node.url || visited.has(node.url)) return;
      visited.add(node.url);

      const isExpanded = expandedNodes.has(node.url);
      const childCount = node.links?.length || 0;

      nodes.push({
        id: node.url,
        name: node.url.split('/').filter(Boolean).pop() || "/",
        childCount: childCount,
        isExpanded: isExpanded,
        color: node.id === "" ? "#4A5568" : (isExpanded ? "#63B3ED" : "#3182CE"),
        val: Math.log(childCount + 2) * 5
      });

      // Only traverse children if this node is expanded
      if (isExpanded && node.links) {
        node.links.forEach((child: TreeLink) => {
          if (child.url) {
            links.push({ source: node.url, target: child.url });
            traverse(child);
          }
        });
      }
    };

    traverse(root);
    return { nodes, links };
  }, [expandedNodes]);

  const graphData = useMemo(() => getVisibleGraph(treeData), [treeData, getVisibleGraph]);

  // 2. Handle Clicking a node
  const handleNodeClick = (node: any) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(node.id)) {
      newExpanded.delete(node.id); // Collapse
    } else {
      newExpanded.add(node.id); // Expand
    }
    setExpandedNodes(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-gray-900">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;

          // Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.fill();

          // If collapsed and has many children, draw a ring or indicator
          if (!node.isExpanded && node.childCount > 0) {
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();

            // Draw "+[count]" text
            ctx.fillStyle = '#9AE6B4';
            ctx.fillText(`+${node.childCount}`, node.x, node.y - 10);
          }

          // Label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText("", node.x, node.y + 12);
        }}
      />
    </div>
  );
};