import React from "react";
import { waybackToMs, msToDateInput, msToWayback, dateInputToMs } from "../utils/util";

interface Props {
  timeBounds: [number, number];
  timeRange: [number, number];
  setTimeRange: (range: [number, number]) => void;
}

const TimeFilter: React.FC<Props> = ({ timeBounds, timeRange, setTimeRange }) => {
  if (timeBounds[0] === 0) return null;

  const minMs = waybackToMs(timeBounds[0]);
  const maxMs = waybackToMs(timeBounds[1]);
  const loMs = waybackToMs(timeRange[0]);
  const hiMs = waybackToMs(timeRange[1]);
  const total = maxMs - minMs || 1;
  const leftPct = ((loMs - minMs) / total) * 100;
  const rightPct = ((hiMs - minMs) / total) * 100;
  const isFiltered = loMs > minMs || hiMs < maxMs;

  return (
    <div style={{
      position: "absolute", top: "10px", right: "10px",
      backgroundColor: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(6px)",
      border: "1px solid #C7D9F5",
      borderRadius: "10px",
      padding: "10px 13px 12px",
      zIndex: 50,
      width: "270px",
      boxShadow: "0 2px 8px rgba(0,46,112,0.12)",
      pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Time Filter</span>
        {isFiltered && (
          <button onClick={() => setTimeRange(timeBounds)} style={{ fontSize: "10px", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>Reset</button>
        )}
      </div>

      <div style={{ position: "relative", height: "22px", marginBottom: "10px" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, background: "#e2e8f0", transform: "translateY(-50%)", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${leftPct}%`, width: `${rightPct - leftPct}%`, height: 4, background: "#3b82f6", borderRadius: 2 }} />
        <input type="range" className="tr-slider tr-slider-lo"
          min={minMs} max={maxMs} step={86400000} value={loMs}
          onChange={e => {
            const v = Math.min(+e.target.value, hiMs - 86400000);
            setTimeRange([msToWayback(v, false), timeRange[1]]);
          }}
          style={{ position: "absolute", width: "100%", WebkitAppearance: "none", appearance: "none", background: "transparent", outline: "none", height: "100%", margin: 0, padding: 0, pointerEvents: "none", zIndex: 2 }}
        />
        <input type="range" className="tr-slider tr-slider-hi"
          min={minMs} max={maxMs} step={86400000} value={hiMs}
          onChange={e => {
            const v = Math.max(+e.target.value, loMs + 86400000);
            setTimeRange([timeRange[0], msToWayback(v, true)]);
          }}
          style={{ position: "absolute", width: "100%", WebkitAppearance: "none", appearance: "none", background: "transparent", outline: "none", height: "100%", margin: 0, padding: 0, pointerEvents: "none", zIndex: 2 }}
        />
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input type="date"
          value={msToDateInput(loMs)}
          min={msToDateInput(minMs)} max={msToDateInput(hiMs)}
          onChange={e => {
            if (!e.target.value) return;
            const ms = dateInputToMs(e.target.value);
            if (ms >= minMs && ms <= hiMs) setTimeRange([msToWayback(ms, false), timeRange[1]]);
          }}
          style={{ flex: 1, fontSize: "11px", padding: "3px 5px", border: "1px solid #C7D9F5", borderRadius: "5px", color: "#334155", outline: "none" }}
        />
        <span style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}>–</span>
        <input type="date"
          value={msToDateInput(hiMs)}
          min={msToDateInput(loMs)} max={msToDateInput(maxMs)}
          onChange={e => {
            if (!e.target.value) return;
            const ms = dateInputToMs(e.target.value);
            if (ms >= loMs && ms <= maxMs) setTimeRange([timeRange[0], msToWayback(ms, true)]);
          }}
          style={{ flex: 1, fontSize: "11px", padding: "3px 5px", border: "1px solid #C7D9F5", borderRadius: "5px", color: "#334155", outline: "none" }}
        />
      </div>
      <style>{`
        .tr-slider { pointer-events: none; }
        .tr-slider::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:16px; height:16px; border-radius:50%; background:#3b82f6; border:2.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.3); cursor:pointer; pointer-events:all; }
        .tr-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#3b82f6; border:2.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.3); cursor:pointer; pointer-events:all; border-box:border-box; }
        .tr-slider:focus { outline: none; }
      `}</style>
    </div>
  );
};

export default TimeFilter;
