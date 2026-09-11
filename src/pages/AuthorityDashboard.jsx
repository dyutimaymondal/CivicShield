import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ShieldAlert,
  Clock,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Send,
  Radio,
  MapPin,
  CheckSquare,
  Square,
  Flame
} from "lucide-react";
import { civicStore } from "../lib/civicStore";
import { generateAuthorityBrief, generateAuthorityBriefAsync } from "../lib/aiIntelligence";
import CivicProblemMap from "../components/CivicProblemMap";
import ThemeToggle from "../components/ThemeToggle";
import "../authority.css";

export default function AuthorityDashboard() {
  const [incidents, setIncidents] = useState(() => {
    return [...civicStore.getIncidents()].sort(
      (a, b) => (b.priority_score || 0) - (a.priority_score || 0)
    );
  });
  const [microProtests, setMicroProtests] = useState(() => civicStore.getMicroProtests());
  const [selectedIncident, setSelectedIncident] = useState(() => {
    const list = civicStore.getIncidents();
    return list.length > 0 ? list[0] : null;
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState("console"); // "console" | "heatmap"

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Form states for dispatch
  const [newStatus, setNewStatus] = useState(() => {
    const list = civicStore.getIncidents();
    return list[0]?.status || "IN_PROGRESS";
  });
  const [department, setDepartment] = useState(() => {
    const list = civicStore.getIncidents();
    return list[0]?.department || "Public Works Department (PWD)";
  });
  const [officialResponse, setOfficialResponse] = useState(() => {
    const list = civicStore.getIncidents();
    return list[0]?.official_response || "";
  });
  const [checkedActions, setCheckedActions] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    function loadData() {
      const allIncidents = civicStore.getIncidents();
      const allProtests = civicStore.getMicroProtests();

      const sorted = [...allIncidents].sort(
        (a, b) => (b.priority_score || 0) - (a.priority_score || 0)
      );

      setIncidents(sorted);
      setMicroProtests(allProtests);
    }

    const unsubscribe = civicStore.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setNewStatus(inc.status || "IN_PROGRESS");
    setDepartment(inc.department || "Public Works Department (PWD)");
    setOfficialResponse(inc.official_response || "");
    setCheckedActions({});
    setStatusMessage("");
  };

  const handleToggleAction = (actionIdx) => {
    setCheckedActions((prev) => ({
      ...prev,
      [actionIdx]: !prev[actionIdx]
    }));
  };

  const handleAdoptAllActions = (actions) => {
    const all = {};
    actions.forEach((_, i) => {
      all[i] = true;
    });
    setCheckedActions(all);
    setOfficialResponse(
      `Adopted recommended municipal actions: ${actions.slice(0, 2).join("; ")}. Dispatch crews scheduled.`
    );
  };

  const handleUpdateStatus = (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    civicStore.updateIncidentStatus(
      selectedIncident.id,
      newStatus,
      officialResponse,
      department
    );

    setStatusMessage("✓ Official municipal response & dispatch status successfully published to live citizen feed!");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  // Filter queue
  const filteredQueue = incidents.filter((inc) => {
    if (selectedDepartment !== "all" && !inc.department?.toLowerCase().includes(selectedDepartment.toLowerCase())) {
      return false;
    }
    if (selectedStatus !== "all" && inc.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    return true;
  });

  const activeProtest = selectedIncident
    ? microProtests.find((p) => p.incident_id === selectedIncident.id)
    : null;

  const syncBrief = selectedIncident
    ? generateAuthorityBrief(
        selectedIncident,
        activeProtest,
        selectedIncident.count,
        activeProtest?.support_count
      )
    : null;

  const [asyncBrief, setAsyncBrief] = useState(null);

  useEffect(() => {
    if (!selectedIncident) return;

    let isMounted = true;
    generateAuthorityBriefAsync(
      selectedIncident,
      activeProtest,
      selectedIncident.count,
      activeProtest?.support_count
    ).then((enhanced) => {
      if (isMounted && enhanced) {
        setAsyncBrief(enhanced);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedIncident, activeProtest]);

  const authorityBrief = (asyncBrief && asyncBrief.incidentId === selectedIncident?.id)
    ? asyncBrief
    : syncBrief;

  // KPI calculations
  const criticalCount = incidents.filter((i) => (i.priority_score || 0) >= 0.75).length;
  const inProgressCount = incidents.filter((i) => i.status === "IN_PROGRESS").length;
  const totalReports = incidents.reduce((sum, i) => sum + (i.count || 1), 0);
  const activeProtestsCount = microProtests.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="authority-page">
      {/* Navbar */}
      <nav className="authority-nav">
        <div className="dashboard-brand">
          <div className="brand-icon-box" style={{ background: "rgba(245, 158, 11, 0.2)", color: "var(--accent-amber)" }}>
            <Building2 size={22} />
          </div>
          <div className="brand-title">
            <h2>Civic<span>Shield</span></h2>
            <span className="portal-tag">Municipal Authority Operations Command</span>
          </div>
        </div>

        <div className="incidents-nav-actions">
          <Link to="/" className="nav-link-btn">Home</Link>
          <Link to="/incidents" className="nav-link-btn">Public Incidents</Link>
          <Link to="/dashboard" className="nav-link-btn">Citizen Portal</Link>
          <div className="authority-badge">
            <ShieldAlert size={14} />
            <span>DISPATCH OFFICER ROLE ACTIVE</span>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </nav>

      {/* Main Container */}
      <main className="authority-container">
        {/* Header */}
        <div className="authority-header-row">
          <div className="authority-title-block">
            <h1>
              <Building2 className="title-icon" style={{ color: "var(--accent-amber)" }} />
              Municipal Triage & Public Works Dispatch Console
            </h1>
            <p>
              Review explainable AI incident clusters, inspect evidence proofs, and deploy municipal crews
              in response to <strong>Digital Micro-Protest</strong> collective civic demands.
            </p>
          </div>

          <div className="dispatch-live-pill">
            <Radio size={14} />
            <span>AUTHORITY DISPATCH GRID ONLINE</span>
          </div>
        </div>

        {/* KPIs */}
        <section className="authority-kpis">
          <div className="kpi-card">
            <div className="kpi-icon-box amber">
              <AlertTriangle size={22} />
            </div>
            <div className="kpi-data">
              <h3>{criticalCount}</h3>
              <p>P0 Emergency / High Hazards</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box cyan">
              <Layers size={22} />
            </div>
            <div className="kpi-data">
              <h3>{totalReports.toLocaleString()}</h3>
              <p>Citizen Telemetry Reports</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box emerald">
              <Users size={22} />
            </div>
            <div className="kpi-data">
              <h3>{activeProtestsCount}</h3>
              <p>Active Micro-Protest Demands</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box violet">
              <Clock size={22} />
            </div>
            <div className="kpi-data">
              <h3>{inProgressCount}</h3>
              <p>Active Work Orders In-Field</p>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "10px", margin: "20px 0", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: activeTab === "console" ? "#f59e0b" : "rgba(255,255,255,0.1)",
              background: activeTab === "console" ? "rgba(245, 158, 11, 0.15)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "console" ? "#fbbf24" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Building2 size={16} />
            <span>Dispatch & Priority Console</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: activeTab === "heatmap" ? "#ef4444" : "rgba(255,255,255,0.1)",
              background: activeTab === "heatmap" ? "rgba(239, 68, 68, 0.15)" : "rgba(15, 23, 42, 0.6)",
              color: activeTab === "heatmap" ? "#f87171" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Flame size={16} />
            <span>Civic Problem Heatmap 🗺️</span>
          </button>
        </div>

        {activeTab === "heatmap" ? (
          <section style={{ marginBottom: "32px" }}>
            <CivicProblemMap />
          </section>
        ) : (
        /* Layout Grid */
        <div className="authority-layout-grid">
          {/* Left Column: Prioritized Incident Queue */}
          <div className="queue-column">
            <div className="queue-header">
              <h3>
                <span>Prioritized Dispatch Queue</span>
                <span style={{ fontSize: "12px", color: "var(--accent-amber)" }}>
                  {filteredQueue.length} Incidents
                </span>
              </h3>
            </div>

            {/* Department & Status Filters */}
            <div className="queue-filters-strip">
              <div className="dept-select-wrap">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">All Municipal Departments</option>
                  <option value="Public Works">Public Works Department (PWD)</option>
                  <option value="Water">Water Supply & Drainage</option>
                  <option value="Sanitation">Sanitation & Waste</option>
                  <option value="Power">Electrical & Grid</option>
                  <option value="Safety">Public Safety & Emergency</option>
                </select>
              </div>

              <div className="filter-pills-row">
                <button
                  className={`filter-chip ${selectedStatus === "all" ? "active" : ""}`}
                  onClick={() => setSelectedStatus("all")}
                >
                  All
                </button>
                <button
                  className={`filter-chip ${selectedStatus === "new" ? "active" : ""}`}
                  onClick={() => setSelectedStatus("new")}
                >
                  New
                </button>
                <button
                  className={`filter-chip ${selectedStatus === "in_progress" ? "active" : ""}`}
                  onClick={() => setSelectedStatus("in_progress")}
                >
                  In Progress
                </button>
                <button
                  className={`filter-chip ${selectedStatus === "resolved" ? "active" : ""}`}
                  onClick={() => setSelectedStatus("resolved")}
                >
                  Resolved
                </button>
              </div>
            </div>

            {/* Scrollable Queue List */}
            <div className="queue-scroll-list">
              {filteredQueue.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const mp = microProtests.find((p) => p.incident_id === inc.id);

                return (
                  <div
                    key={inc.id}
                    className={`queue-item-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectIncident(inc)}
                  >
                    <div className="queue-card-top">
                      <span className={`status-pill ${inc.status?.toLowerCase()}`}>
                        {inc.status}
                      </span>
                      <span className="priority-score-tag">
                        Score: {(inc.priority_score || 0.75).toFixed(3)}
                      </span>
                    </div>

                    <h4>{inc.title}</h4>

                    <div className="queue-item-loc">
                      <MapPin size={12} />
                      <span>{inc.location || "Sector Coordinate"}</span>
                    </div>

                    <div className="queue-item-footer">
                      <span><strong>{inc.count || 1}</strong> citizen reports</span>
                      {mp && mp.status === "ACTIVE" && (
                        <span className="protest-badge-mini">
                          <Users size={12} />
                          <span>{mp.support_count?.toLocaleString()} votes</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Incident & AI Brief */}
          <div className="dispatch-detail-col">
            {selectedIncident ? (
              <div className="dispatch-panel-card">
                {/* Header */}
                <div className="panel-header-row">
                  <div className="panel-title">
                    <div className="panel-badges">
                      <span className={`status-pill ${selectedIncident.status?.toLowerCase()}`}>
                        {selectedIncident.status}
                      </span>
                      <span className="category-pill">{selectedIncident.category}</span>
                      <span className="priority-pill">
                        Dynamic Priority: {selectedIncident.priority} ({(selectedIncident.priority_score || 0.75).toFixed(3)})
                      </span>
                    </div>
                    <h2>{selectedIncident.title}</h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      Location: {selectedIncident.location} • First reported {new Date(selectedIncident.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Stats Ribbon */}
                <div className="incident-stats-grid">
                  <div className="stat-box-mini">
                    <span>Clustered Reports</span>
                    <strong>{selectedIncident.count || 1}</strong>
                  </div>
                  <div className="stat-box-mini">
                    <span>Assigned Department</span>
                    <strong>{selectedIncident.department || "Municipal Triage"}</strong>
                  </div>
                  <div className="stat-box-mini">
                    <span>Micro-Protest Demand</span>
                    <strong className="cyan">
                      {activeProtest ? `${activeProtest.support_count?.toLocaleString()} Supporters` : "None"}
                    </strong>
                  </div>
                  <div className="stat-box-mini">
                    <span>Support Velocity</span>
                    <strong className="emerald">
                      {activeProtest ? `+${activeProtest.velocity_6h || 15} (6h)` : "N/A"}
                    </strong>
                  </div>
                </div>

                {/* Full Description */}
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#cbd5e1", marginBottom: "20px" }}>
                  {selectedIncident.description}
                </p>

                {/* ------------------------------------------------------------- */}
                {/* AI AUTHORITY BRIEF ENCLAVE (PRD SECTION 20)                   */}
                {/* ------------------------------------------------------------- */}
                {authorityBrief && (
                  <div className="ai-authority-brief-enclave">
                    <div className="brief-enclave-header">
                      <span className="brief-pill-label">
                        <Sparkles size={14} />
                        CIVICSHIELD AI AUTHORITY BRIEF & DISPATCH DOSSIER
                        {authorityBrief.model && (
                          <span style={{ marginLeft: "8px", fontSize: "11px", opacity: 0.9, color: "var(--accent-cyan)", fontWeight: 600 }}>
                            ⚡ {authorityBrief.model}
                          </span>
                        )}
                      </span>
                      <button
                        className="toggle-breakdown-btn"
                        onClick={() => handleAdoptAllActions(authorityBrief.recommendedActions)}
                      >
                        Adopt All Recommended Steps
                      </button>
                    </div>

                    <div className="brief-demand-section">
                      <h4>Verified Citizen Demand (Digital Micro-Protest):</h4>
                      <p>"{authorityBrief.publicDemand}"</p>
                      <div className="support-signal-strip">
                        <span>
                          Backed by <strong>{authorityBrief.collectiveSupport.verifiedSupporters.toLocaleString()}</strong> verified citizens
                        </span>
                        <span>
                          Velocity Trend: <strong>+{authorityBrief.collectiveSupport.velocity6h} in last 6 hours</strong>
                        </span>
                      </div>
                    </div>

                    <div className="recommended-actions-list">
                      <h4>AI-Identified Possible Municipal Actions:</h4>
                      {authorityBrief.recommendedActions.map((action, idx) => {
                        const isChecked = !!checkedActions[idx];
                        return (
                          <div
                            key={idx}
                            className={`action-checkbox-item ${isChecked ? "checked" : ""}`}
                            onClick={() => handleToggleAction(idx)}
                          >
                            {isChecked ? <CheckSquare size={16} style={{ color: "var(--accent-emerald)" }} /> : <Square size={16} />}
                            <span>{action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* DISPATCH ACTION CONTROLS & OFFICIAL RESPONSE                  */}
                {/* ------------------------------------------------------------- */}
                <form onSubmit={handleUpdateStatus} className="dispatch-action-controls">
                  <h3>
                    <Send size={16} style={{ color: "var(--accent-amber)" }} />
                    <span>Official Dispatch Action & Public Response</span>
                  </h3>

                  <div className="dispatch-form-grid">
                    <div className="control-field">
                      <label>Update Incident Status:</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="VERIFIED">VERIFIED — Incident & Evidence Confirmed</option>
                        <option value="ASSIGNED">ASSIGNED — Crew Dispatched to Sector</option>
                        <option value="IN_PROGRESS">IN_PROGRESS — Active Remediation Underway</option>
                        <option value="RESOLVED">RESOLVED — Public Hazard Remediated</option>
                        <option value="CLOSED">CLOSED — Final Municipal Inspection Complete</option>
                      </select>
                    </div>

                    <div className="control-field">
                      <label>Target Department / Agency:</label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                        <option value="Water Supply & Sewerage Board">Water Supply & Sewerage Board</option>
                        <option value="Municipal Sanitation Dept">Municipal Sanitation Dept</option>
                        <option value="Electricity & Grid Safety Board">Electricity & Grid Safety Board</option>
                        <option value="Emergency Public Safety Dispatch">Emergency Public Safety Dispatch</option>
                      </select>
                    </div>

                    <div className="control-field full-width">
                      <label>Official Public Response (Broadcasted to Citizen Telemetry):</label>
                      <textarea
                        rows={3}
                        placeholder="Detail the municipal action taken, repair crew dispatched, or expected resolution timeline..."
                        value={officialResponse}
                        onChange={(e) => setOfficialResponse(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="update-status-submit-btn">
                    <Send size={16} />
                    <span>Publish Official Response & Dispatch Status</span>
                  </button>

                  {statusMessage && (
                    <div className="protest-message-banner success" style={{ marginTop: "14px" }}>
                      <CheckCircle2 size={16} />
                      <span>{statusMessage}</span>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div className="dispatch-panel-card">
                <p>Select an incident from the queue on the left to inspect telemetry and dispatch actions.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
