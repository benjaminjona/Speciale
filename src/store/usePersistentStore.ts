import { create } from "zustand";
import { persist } from "zustand/middleware";
import { stripWww } from "../utils/util";

export interface SelectedNode {
  url: string;
  addedAt: number;
}

interface SelectedNodesState {
  nodes: SelectedNode[];
  addNode: (node: Omit<SelectedNode, "addedAt">) => void;
  baseCrawlTime: number;
  setBaseCrawlTime: (time: number) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  removeNode: (id: string) => void;
  clearNodes: () => void;
}

const CHANNEL_NAME = "selected-nodes-sync";

export const usePersistentStore = create<SelectedNodesState>()(
  persist(
    (set) => ({
      nodes: [],
      baseCrawlTime: 0,
      baseUrl: "",
      setBaseCrawlTime: (time) => set(() => ({ baseCrawlTime: time })),
      setBaseUrl: (url) => set(() => ({ baseUrl: stripWww(url) })),
      addNode: (node) =>
        set((state) => {
          const sanitized = { ...node, url: stripWww(node.url) };
          const updated = [...state.nodes, { ...sanitized, addedAt: Date.now() }];
          broadcast(updated);
          return { nodes: updated };
        }),
      removeNode: (id) =>
        set((state) => {
          const updated = state.nodes.filter((n) => (n as any).id !== id);
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

getChannel();
