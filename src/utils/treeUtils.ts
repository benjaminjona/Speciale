import {JsonDataLink} from "../pages/OverviewPage.tsx";

export type TreeLink = {
  id: string;
  url: string;
  wayback_date: number;
  links: TreeLink[] | any;
};

export const buildTreeWithClosestMatch = (
  data: JsonDataLink[],
  rootUrl: string,
  requestedTimestamp: number,
  domain: string
): TreeLink | null => {
  if (!data || !rootUrl) return null;

  const visited = new Set<string>();

  // Helper to find the closest snapshot (unchanged logic)
  const findClosestMatch = (url: string, wayback_date: number) => {
    const candidates = data.filter(item => item.url === url || item.url_norm === url);
    if (candidates.length === 0) return undefined;
    return candidates.reduce((closest, item) => {
      return Math.abs(item.wayback_date - wayback_date) < Math.abs(closest.wayback_date - wayback_date)
        ? item : closest;
    }, candidates[0]);
  };

  // 1. Initialize the Root
  const rootMatch = findClosestMatch(rootUrl, requestedTimestamp);
  if (!rootMatch) return { id: "", url: rootUrl, wayback_date: requestedTimestamp, links: [] };

  const rootNode: TreeLink = {
    id: rootMatch.id,
    url: rootMatch.url,
    wayback_date: rootMatch.wayback_date,
    links: []
  };

  visited.add(rootMatch.url);

  // 2. Initialize the Queue for BFS
  // We store the 'closest' data object and the 'treeNode' it belongs to
  const queue: { currentMatch: JsonDataLink; treeNode: TreeLink }[] = [
    { currentMatch: rootMatch, treeNode: rootNode }
  ];

  // 3. Process the Queue
  while (queue.length > 0) {
    const { currentMatch, treeNode } = queue.shift()!; // Get the next item (Level by Level)

    if (!currentMatch.links) continue;
    const filteredLinks = (currentMatch.links || []).filter((linkUrl: string) =>
      linkUrl.includes(domain) && !linkUrl.includes("mailto:")
    );

    for (const linkUrl of filteredLinks) {
      const closestChild = findClosestMatch(linkUrl, requestedTimestamp);
      if (closestChild && !visited.has(closestChild.url)) {
        visited.add(closestChild.url);

        const newNode: TreeLink = {
          id: closestChild.id,
          url: closestChild.url,
          wayback_date: closestChild.id ? closestChild.wayback_date : requestedTimestamp,
          links: []
        };
        treeNode.links.push(newNode);
        queue.push({ currentMatch: closestChild, treeNode: newNode });
      } else if (!closestChild) {
        treeNode.links.push({ id: "", url: linkUrl, wayback_date: requestedTimestamp, links: [] });
      }
    }
  }

  return rootNode;
};

// Use the TreeLink type we defined earlier since that's what buildTree returns
export const flattenTreeForGraph = (tree: any) => {
  const nodes: any[] = [];
  const links: any[] = [];
  const seen = new Set<string>();

  // If tree is null or undefined, return empty data
  if (!tree) return { nodes, links };

  const traverse = (node: any) => {
    // Check if node exists and has a valid URL
    if (!node || !node.url || seen.has(node.url)) return;

    seen.add(node.url);

    // 1. Create the Node
    // We add a fallback for the name in case split fails
    const name = node.url ? node.url.split('/').filter(Boolean).pop() : "Unknown";

    nodes.push({
      id: node.url,
      name: name,
      // Increase size (val) if it has many links, minimum size of 1
      val: Array.isArray(node.links) ? Math.log(node.links.length + 2) * 5 : 2,
      // Color code: Gray if it's a "dead end" (no ID found in dump), Blue if it's valid
      color: node.id === "" ? "#4A5568" : "#3182CE"
    });

    // 2. Process Children
    if (node.links && Array.isArray(node.links)) {
      node.links.forEach((child: any) => {
        // Only create a link if the child actually has a URL
        if (child && child.url) {
          links.push({
            source: node.url,
            target: child.url
          });
          traverse(child);
        }
      });
    }
  };

  // The function expects an object, but let's handle if it's wrapped in an array
  const root = Array.isArray(tree) ? tree[0] : tree;
  traverse(root);

  return { nodes, links };
};
