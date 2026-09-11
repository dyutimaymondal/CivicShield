import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Info } from "lucide-react";

export default function MapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  const legendItems = [
    {
      color: "#22c55e",
      label: "Low Density",
      intensity: "Low",
      threshold: "1 complaint",
      glow: "rgba(34, 197, 94, 0.4)"
    },
    {
      color: "#eab308",
      label: "Moderate Density",
      intensity: "Moderate",
      threshold: "2–5 complaints",
      glow: "rgba(234, 179, 8, 0.4)"
    },
    {
      color: "#f97316",
      label: "High Density",
      intensity: "High",
      threshold: "6–10 complaints",
      glow: "rgba(249, 115, 22, 0.4)"
    },
    {
      color: "#ef4444",
      label: "Critical Density",
      intensity: "Critical",
      threshold: "10+ complaints",
      glow: "rgba(239, 68, 68, 0.5)"
    }
  ];

  return (
    <div className={`map-legend-card ${collapsed ? "collapsed" : ""}`}>
      <div className="map-legend-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="legend-title">
          <Layers size={14} className="legend-icon" />
          <span>Heatmap Intensity Legend</span>
        </div>
        <button
          type="button"
          className="legend-collapse-btn"
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="map-legend-body">
          {/* Continuous Gradient Bar */}
          <div className="legend-gradient-bar" />

          {/* Density Scale Items */}
          <div className="legend-items-list">
            {legendItems.map((item) => (
              <div key={item.intensity} className="legend-item">
                <div className="legend-item-indicator">
                  <span
                    className="legend-dot"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.glow}`
                    }}
                  />
                  <span className="legend-level" style={{ color: item.color }}>
                    {item.intensity}
                  </span>
                </div>
                <span className="legend-range">{item.threshold}</span>
              </div>
            ))}
          </div>

          {/* Severity Weighting Note */}
          <div className="legend-weights-note">
            <div className="weights-title">
              <Info size={11} />
              <span>Dynamic Severity Weighting</span>
            </div>
            <div className="weights-chips">
              <span className="w-chip w-low">Low: 1×</span>
              <span className="w-chip w-med">Med: 2×</span>
              <span className="w-chip w-high">High: 4×</span>
              <span className="w-chip w-crit">Crit: 7×</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
