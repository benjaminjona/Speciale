  import { create } from "zustand";
  import { persist } from "zustand/middleware";

  export interface SelectedNode {
    url: string;
    // id: string;
    addedAt: number;
    // wayback_date?: number;
  }

  interface SelectedNodesState {
    nodes: SelectedNode[];
    addNode: (node: Omit<SelectedNode, "addedAt">) => void;
    baseCrawlTime: number;
    setBaseCrawlTime: (time: number) => void;
    removeNode: (id: string) => void;
    clearNodes: () => void;
  }

  const CHANNEL_NAME = "selected-nodes-sync";

  export const usePersistentStore = create<SelectedNodesState>()(
    persist(
      (set) => ({
        nodes: [],
        baseCrawlTime: 0,
         setBaseCrawlTime: (time) =>
            set(() => {
               return { baseCrawlTime: time };
            })
        ,
        addNode: (node) =>
          set((state) => {
            const updated = [...state.nodes, { ...node, addedAt: Date.now() }];
            broadcast(updated);
            return { nodes: updated };
          }),
        removeNode: (id) =>
          set((state) => {
            const updated = state.nodes.filter((n) => n.id !== id);
            broadcast(updated);
            return { nodes: updated };
          }),
        clearNodes: () =>
          set(() => {
            broadcast([]);
            return { nodes: [] };
          }),

      }),
      { name: "selected-nodes" }
    )
  );

  // --- Cross-tab sync via BroadcastChannel ---
  let channel: BroadcastChannel | null = null;

  function getChannel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null;
    if (!channel) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SelectedNode[]>) => {
        usePersistentStore.setState({ nodes: event.data });
      };
    }
    return channel;
  }

  function broadcast(nodes: SelectedNode[]) {
    getChannel()?.postMessage(nodes);
  }

  // Initialise the listener on module load
  getChannel();
