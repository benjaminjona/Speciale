import { useMemo, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { TreeLink } from "../utils/treeUtils.ts";

export const CytoscapeDomainGraph = ({ treeData }: { treeData: TreeLink }) => {
  const cyRef = useRef<any>(null);

  // 1. Transform TreeData into Cytoscape Elements
  const elements = useMemo(() => {
    if (!treeData) return [];
    const cyElements: any[] = [];
    const visited = new Set();

    const traverse = (node: TreeLink, parentId?: string) => {
      if (!node || !node.url || visited.has(node.url)) return;
      visited.add(node.url);

      const childCount = node.links?.length || 0;
      // Size logic: base 30px + proportional growth for 1000+ children
      const size = 30 + (Math.sqrt(childCount) * 8);

      cyElements.push({
        data: {
          id: node.url,
          label: node.url.split('/').filter(Boolean).pop() || "/",
          childCount,
          size
        }
      });

      if (parentId) {
        cyElements.push({
          data: { source: parentId, target: node.url }
        });
      }

      if (node.links) {
        node.links.forEach((child:any) => traverse(child, node.url));
      }
    };

    traverse(treeData);
    return cyElements;
  }, [treeData]);

  // 2. Visual Stylesheet
  const stylesheet: any = [
    {
      selector: 'node',
      style: {
        'width': 'data(size)',
        'height': 'data(size)',
        'label': 'data(label)',
        'background-color': '#3182CE',
        'color': '#ffffff',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': 2,
        'border-color': '#63B3ED'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#4A5568',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#4A5568',
        'opacity': 0.5
      }
    },
    {
      // Highlight "Mega-Clusters" (e.g., nodes with > 100 links)
      selector: 'node[childCount > 100]',
      style: {
        'background-color': '#E53E3E',
        'border-color': '#FEB2B2',
        'font-weight': 'bold'
      }
    }
  ];

  // 3. Layout Trigger
  useEffect(() => {
    if (cyRef.current && elements.length > 0) {
      const cy = cyRef.current;
      cy.layout({
        name: 'breadthfirst', // Organizes by link depth
        directed: true,
        padding: 40,
        spacingFactor: 1.5
      }).run();
      cy.fit(); // Zoom to fit the tree
    }
  }, [elements]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a202c',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        cy={(cy) => {
          cyRef.current = cy;
          // Set zoom constraints
          cy.minZoom(0.1);
          cy.maxZoom(3);
        }}
      />
    </div>
  );
};