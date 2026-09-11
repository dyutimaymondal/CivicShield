import React from "react";
import {
  X,
  MapPin,
  AlertTriangle,
  Clock,
  Layers,
  FileText
} from "lucide-react";

export default function MapIncidentDetailPanel({ clusterData, onClose, onInspectReport }) {
  if (!clusterData) return null;

  const {
    location = "Kolkata Civic Sector",
    reportsCount = 1,
    dominantCategory = "General Civic Concern",
    highestSeverity = "Medium",
    timeAgo = "Recent",
    reports = [],
    intensityLevel = "Moderate"
  } = clusterData;

  const getSeverityStyle = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s.includes("crit")) {
      return { label: "CRITICAL", bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.35)" };
    }
    if (s.includes("high")) {
      return { label: "HIGH", bg: "rgba(249, 115, 22, 0.15)", text: "#fb923c", border: "rgba(249, 115, 22, 0.35)" };
    }
    if (s.includes("med")) {
      return { label: "MEDIUM", bg: "rgba(234, 179, 8, 0.15)", text: "#facc15", border: "rgba(234, 179, 8, 0.35)" };
    }
    return { label: "LOW", bg: "rgba(34, 197, 94, 0.15)", text: "#4ade80", border: "rgba(34, 197, 94, 0.35)" };
  };

  const sevStyle = getSeverityStyle(highestSeverity);

  return (
    <div className="map-detail-panel animate-slide-up">
      {/* Panel Header */}
      <div className="detail-panel-header">
        <div className="detail-location-badge">
          <MapPin size={15} className="location-pin-icon" />
          <span className="location-title" title={location}>
            {location}
          </span>
        </div>
        <button
          type="button"
          className="detail-close-btn"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span className="kpi-label">Nearby Complaints</span>
          <div className="kpi-value-row">
            <span className="kpi-val count-accent">{reportsCount}</span>
            <span className="kpi-tag">{intensityLevel} Cluster</span>
          </div>
        </div>

        <div className="detail-kpi-card">
          <span className="kpi-label">Highest Severity</span>
          <div
            className="kpi-severity-pill"
            style={{
              backgroundColor: sevStyle.bg,
              color: sevStyle.text,
              borderColor: sevStyle.border
            }}
          >
            <AlertTriangle size={12} />
            <span>{sevStyle.label}</span>
          </div>
        </div>
      </div>

      {/* Dominant Category & Time Banner */}
      <div className="detail-info-row">
        <div className="info-item">
          <span className="info-caption">Dominant Issue Category</span>
          <div className="info-val-badge">
            <Layers size={13} />
            <span>{dominantCategory}</span>
          </div>
        </div>

        <div className="info-item">
          <span className="info-caption">Latest Report</span>
          <div className="info-val-badge time-badge">
            <Clock size={13} />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Reports Breakdown Feed */}
      <div className="detail-reports-section">
        <div className="reports-section-header">
          <FileText size={13} />
          <span>Clustered Complaints in Vicinity ({reports.length})</span>
        </div>

        <div className="detail-reports-list custom-scroll">
          {reports.slice(0, 5).map((r, i) => {
            const reportSev = getSeverityStyle(r.severity);
            return (
              <div
                key={r.id || i}
                className="detail-report-item"
                onClick={() => onInspectReport && onInspectReport(r)}
              >
                <div className="report-item-top">
                  <span className="report-item-title">{r.title || r.description?.slice(0, 45) || "Civic Grievance"}</span>
                  <span
                    className="report-item-sev"
                    style={{
                      color: reportSev.text,
                      backgroundColor: reportSev.bg
                    }}
                  >
                    {reportSev.label}
                  </span>
                </div>
                {r.description && (
                  <p className="report-item-desc">{r.description.slice(0, 80)}...</p>
                )}
                <div className="report-item-footer">
                  <span className="report-item-category">{r.category || "General"}</span>
                  <span className="report-item-status">{r.status || "Pending"}</span>
                </div>
              </div>
            );
          })}
          {reports.length > 5 && (
            <div className="more-reports-note">
              + {reports.length - 5} additional reports in this coordinate cluster
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
