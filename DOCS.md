# SolrWayback Playback POC

A React frontend for browsing archived web pages served by [SolrWayback](https://github.com/netarchivesuite/solrwayback). Search archived pages, play them back in-browser with time-divergence detection, and explore domain-link graphs.

Free and open source.

**Authors:** Eske Jonatan Junker, Nana Oye Akrofi-Quarcoo & Jonatan Fuglsang Schwennesen — Master's thesis, Computer Science, Aarhus University.

## Requirements

- Node.js 18+
- A running SolrWayback instance (default `http://localhost:8080`)

## Setup

```bash
npm install
npm run dev
```

Dev server runs at `http://localhost:5173`. Requests to `/solrwayback` are proxied to the backend (see `vite.config.ts`).

## Flow

1. **Search** (`/`) — Query SolrWayback's full-text index. Click a result to open playback.
2. **Playback** (`/playback`) — Archived HTML loads in a sandboxed iframe. Embedded resources are checked for time-divergence and highlighted if they exceed a threshold. Link clicks are intercepted and routed through the app.
3. **Overview** (`/overview`) — An interactive graph built from the domain export. Nodes = pages, edges = links. Click to expand, double-click to mark visited. State syncs across tabs via BroadcastChannel.
- react-router-dom v7
