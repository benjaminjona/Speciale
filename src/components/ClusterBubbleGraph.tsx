import { useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export const ClusterBubbleGraph = ({ treeData }: { treeData: any }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([treeData?.url]));

  // Process data to calculate "Mass" (how many descendants)
  const processedData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    const traverse = (node: any, depth = 0) => {
      if (!node || !node.url) return;

      const isExpanded = expandedNodes.has(node.url);
      const childCount = node.links?.length || 0;

      // The "Radius" is based on the child count + base size
      const radius = isExpanded ? Math.max(8, Math.sqrt(childCount) * 4) : 6;

      nodes.push({
        id: node.url,
        name: node.url.split('/').filter(Boolean).pop() || "/",
        val: radius, // This controls the collision area
        childCount,
        isExpanded,
        depth,
        color: depth === 0 ? '#F6AD55' : isExpanded ? '#63B3ED' : '#4FD1C5'
      });

      if (isExpanded && node.links) {
        node.links.forEach((child: any) => {
          links.push({ source: node.url, target: child.url });
          traverse(child, depth + 1);
        });
      }
    };

    traverse(treeData);
    return { nodes, links };
  }, [treeData, expandedNodes]);

  const handleNodeClick = (node: any) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(node.id) ? next.delete(node.id) : next.add(node.id);
      return next;
    });
  };

  return (
    <div className="w-full h-screen bg-black">
      <ForceGraph2D
        graphData={processedData}
        nodeRelSize={1}
        // These settings create the "Clustering" feel
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.1}
        cooldownTicks={150}

        // Custom rendering to show "Volume"
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          // 1. Safety check: If x, y, or val are not numbers, skip this frame
          if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.val)) {
            return;
          }

          const r = node.val || 5; // Fallback radius

          // 2. Draw Glow/Aura (Only if expanded and has valid finite numbers)
          if (node.isExpanded && node.childCount > 0) {
            try {
              // Ensure the gradient values are strictly finite
              const gradient = ctx.createRadialGradient(
                node.x, node.y, r,
                node.x, node.y, Math.max(r * 1.5, 0.1)
              );

              gradient.addColorStop(0, 'rgba(99, 179, 237, 0.2)');
              gradient.addColorStop(1, 'transparent');

              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r * 1.5, 0, 2 * Math.PI);
              ctx.fill();
            } catch (e) {
              // Fallback if gradient still fails
              ctx.fillStyle = 'rgba(99, 179, 237, 0.1)';
              ctx.fill();
            }
          }

          // 3. Main Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = node.color || '#3182CE';
          ctx.fill();

          // 4. Badge/Text (Only if zoomed in enough or useful)
          if (!node.isExpanded && node.childCount > 0 && globalScale > 1.5) {
            ctx.fillStyle = 'white';
            ctx.font = `${8 / globalScale}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.childCount.toString(), node.x, node.y);
          }
        }}
        onNodeClick={handleNodeClick}

        // Adjust Link distance based on cluster size
        // linkDistance={link => 30}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
      />
    </div>
  );
};