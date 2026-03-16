import { useMemo } from 'react';
import { ResponsiveTreeMap } from '@nivo/treemap';

interface TreeMapNode {
  name: string;
  value?: number;
  children?: TreeMapNode[];
  color?: string;
}

const MAX_VISIBLE_CHILDREN = 20;

const TreeMapComponent = ({ treeData }: { treeData: any }) => {
  const data = useMemo(() => {
    const transformData = (node: any): TreeMapNode => {
      const links = Array.isArray(node.links) ? node.links : [];
      const hasChildren = links.length > 0;

      let children: TreeMapNode[] | undefined;

      if (hasChildren) {
        // Sort by depth/complexity if possible, otherwise keep order
        const mappedChildren = links.map(transformData);

        // CLUSTERING LOGIC: If there are too many children, group the tail end
        if (mappedChildren.length > MAX_VISIBLE_CHILDREN) {
          const visible = mappedChildren.slice(0, MAX_VISIBLE_CHILDREN);
          const hiddenCount = mappedChildren.length - MAX_VISIBLE_CHILDREN;

          // Create a "Cluster" node for the remainder
          visible.push({
            name: `+${hiddenCount} Others`,
            value: hiddenCount, // Represent the volume of links
            color: '#cbd5e1'    // Muted grey for the cluster
          });
          children = visible;
        } else {
          children = mappedChildren;
        }
      }

      return {
        // Cleanup name: remove URL junk or empty strings
        name: node.url?.split('/').filter(Boolean).pop() || 'index',
        value: hasChildren ? undefined : 1,
        children
      };
    };

    return transformData(treeData);
  }, [treeData]);

  return (
    <div style={{ height: '800px', width: '100%', background: '#ffffff' }}>
      <ResponsiveTreeMap
        data={data}
        identity="name"
        value="value"
        valueFormat=".0f"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}

        // LABEL OPTIMIZATION
        labelSkipSize={16}       // Hide labels if the box is too small
        label={d => `${d.id}`}   // Use simplified ID/Name
        labelTextColor="white"   // High contrast
        orientLabel={false}      // Keep horizontal for readability

        // STYLING
        colors={{ scheme: 'category10' }}
        nodeOpacity={0.85}
        borderWidth={2}
        borderColor="#ffffff"

        // PARENT LABELS (The "Groups")
        // enableParentLabels={true}
        parentLabelSize={18}
        parentLabelPosition="top"
        parentLabelPadding={10}
      />
    </div>
  );
};

export default TreeMapComponent;