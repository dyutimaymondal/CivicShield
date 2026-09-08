import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Search,
  MapPin,
  Layers,
  Users,
  Activity,
  TrendingUp,
  Building2,
  ChevronRight,
  Radio,
  Megaphone
} from "lucide-react";
import { authStore } from "../lib/authStore";
import { civicStore } from "../lib/civicStore";
import { verificationService } from "../lib/verificationService";
import CivicMap from "../components/CivicMap";
import IncidentDetailModal from "../components/IncidentDetailModal";
import VerifyModal from "../components/VerifyModal";
import "../incidents.css";

export default function Incidents() {
  const [incidents, setIncidents] = useState(() => civicStore.getIncidents());
  const [microProtests, setMicroProtests] = useState(() => civicStore.getMicroProtests());
  const [user, setUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [activeBroadcasts, setActiveBroadcasts] = useState(() => civicStore.getActiveBroadcastAnnouncements());

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Load user & reactive data
  useEffect(() => {
    async function loadUser() {
      const session = await authStore.getActiveSession();
      setUser(session?.user || null);

      if (session?.user) {
        const vStatus = verificationService.getVerificationStatus(session.user.id);
        setIsVerified(vStatus.isVerified);
      }
    }
    loadUser();

    // Listen for verification updates
    const handleVerifyEvent = (e) => {
      setIsVerified(e.detail?.isVerified || false);
    };
    window.addEventListener("civicshield_verification_updated", handleVerifyEvent);

    // Subscribe to store updates
    const unsubscribe = civicStore.subscribe(() => {
      setIncidents(civicStore.getIncidents());
      setMicroProtests(civicStore.getMicroProtests());
      setActiveBroadcasts(civicStore.getActiveBroadcastAnnouncements());
    });

    return () => {
      window.removeEventListener("civicshield_verification_updated", handleVerifyEvent);
      unsubscribe();
    };
  }, []);

  const handleOpenDetail = (incident) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedCategory !== "all" && !inc.category?.toLowerCase().includes(selectedCategory.toLowerCase())) {
      return false;
    }
    if (selectedStatus === "protest") {
      const mp = microProtests.find((p) => p.incident_id === inc.id);
      if (!mp || mp.status !== "ACTIVE") return false;
    } else if (selectedStatus !== "all" && inc.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title?.toLowerCase().includes(q);
      const matchLoc = inc.location?.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchDesc) return false;
    }
    return true;
  });

  // Calculate Aggregates
  const totalReports = incidents.reduce((sum, i) => sum + (i.count || 1), 0);
  const totalProtestSupporters = microProtests.reduce((sum, p) => sum + (p.support_count || 0), 0);
  const activeProtestsCount = microProtests.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="incidents-page">
      {/* Navigation */}
      <header className="incidents-nav">
        <div className="dashboard-brand">
          <div className="brand-icon-box">
            <Shield size={22} />
          </div>
          <div className="brand-title">
            <h2>Civic<span>Shield</span></h2>
            <span className="portal-tag">Public Incident & Demand Explorer</span>
          </div>
        </div>

        <div className="incidents-nav-actions">
          <Link to="/" className="nav-link-btn">Home</Link>
          <Link to="/incidents" className="nav-link-btn active">Public Incidents</Link>
          <Link to="/dashboard" className="nav-link-btn">Citizen Portal</Link>
          <Link to="/government" className="nav-link-btn authority-btn" style={{ borderColor: "#f59e0b", color: "#fde68a" }}>
            <Building2 size={14} />
            <span>Gov Portal 🏛️</span>
          </Link>

          {isVerified ? (
            <div className="verified-citizen-pill" title="Cryptographically Verified Identity Active">
              <ShieldCheck size={14} />
              <span>Verified Citizen</span>
            </div>
          ) : (
            <button
              className="unverified-trigger-btn"
              onClick={() => setIsVerifyModalOpen(true)}
              title="Click to complete simulated Aadhaar verification"
            >
              <Shield size={14} />
              <span>Verify ID (Aadhaar)</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="incidents-container">
        {/* ACTIVE GOVERNMENT EMERGENCY BROADCAST BANNER */}
        {activeBroadcasts.length > 0 && (
          <div style={{
            background: activeBroadcasts[0].severity === "EMERGENCY"
              ? "linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.25) 100%)"
              : "linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.2) 100%)",
            border: activeBroadcasts[0].severity === "EMERGENCY"
              ? "1px solid rgba(239, 68, 68, 0.5)"
              : "1px solid rgba(245, 158, 11, 0.45)",
            borderRadius: "12px",
            padding: "14px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            boxShadow: "0 6px 25px rgba(0, 0, 0, 0.4)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(0, 0, 0, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: activeBroadcasts[0].severity === "EMERGENCY" ? "#fca5a5" : "#fde68a",
                flexShrink: 0
              }}>
                <Megaphone size={20} />
              </div>
              <div>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  color: activeBroadcasts[0].severity === "EMERGENCY" ? "#fca5a5" : "#fde68a",
                  textTransform: "uppercase"
                }}>
                  🏛️ OFFICIAL MUNICIPAL NOTICE • {activeBroadcasts[0].department}
                </span>
                <h4 style={{ margin: "2px 0 3px", fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                  {activeBroadcasts[0].title}
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#e2e8f0", lineHeight: 1.4 }}>
                  {activeBroadcasts[0].message}
                </p>
              </div>
            </div>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
              Public Signal Active
            </span>
          </div>
        )}

        {/* Page Hero */}
        <section className="incidents-hero">
          <div className="hero-eyebrow">
            <Radio size={14} />
            <span>COMMUNITY TELEMETRY • LIVE CIVIC SIGNAL</span>
          </div>
          <h1>Public Incidents & Digital Micro-Protests</h1>
          <p>
            Explore verified community incidents synthesized from citizen reports. Back legitimate public demands
            through authenticated <strong>Digital Micro-Protests</strong> to prioritize municipal action.
          </p>
        </section>

        {/* Top KPI Strip */}
        <section className="incidents-kpi-row">
          <div className="kpi-card">
            <div className="kpi-icon-box cyan">
              <Activity size={22} />
            </div>
            <div className="kpi-data">
              <h3>{incidents.length}</h3>
              <p>Active Unified Incidents</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box violet">
              <Layers size={22} />
            </div>
            <div className="kpi-data">
              <h3>{totalReports.toLocaleString()}</h3>
              <p>Clustered Citizen Reports</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box emerald">
              <Users size={22} />
            </div>
            <div className="kpi-data">
              <h3>{activeProtestsCount}</h3>
              <p>Digital Micro-Protests Active</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box amber">
              <TrendingUp size={22} />
            </div>
            <div className="kpi-data">
              <h3>{totalProtestSupporters.toLocaleString()}</h3>
              <p>Verified Collective Votes</p>
            </div>
          </div>
        </section>

        {/* Controls: Search & Filters */}
        <section className="explorer-controls-bar">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by neighborhood, street, or civic keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills-row">
            <button
              className={`filter-chip ${selectedStatus === "all" ? "active" : ""}`}
              onClick={() => setSelectedStatus("all")}
            >
              All Incidents
            </button>
            <button
              className={`filter-chip ${selectedStatus === "protest" ? "active" : ""}`}
              onClick={() => setSelectedStatus("protest")}
            >
              ⚡ Active Micro-Protests
            </button>
            <button
              className={`filter-chip ${selectedStatus === "in_progress" ? "active" : ""}`}
              onClick={() => setSelectedStatus("in_progress")}
            >
              In Progress
            </button>
            <button
              className={`filter-chip ${selectedStatus === "verified" ? "active" : ""}`}
              onClick={() => setSelectedStatus("verified")}
            >
              Verified
            </button>
          </div>
        </section>

        {/* Category Sub-Filters */}
        <div className="filter-pills-row" style={{ marginBottom: "24px" }}>
          {["all", "Roads", "Water", "Sanitation", "Power", "Safety"].map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === "all" ? "All Domains" : cat}
            </button>
          ))}
        </div>

        {/* Layout Grid: Map & Cards */}
        <div className="explorer-layout-grid">
          {/* Left Column: Interactive Cyber-Civic Map */}
          <CivicMap
            incidents={filteredIncidents}
            onSelectIncident={handleOpenDetail}
            selectedIncidentId={selectedIncident?.id}
          />

          {/* Right Column: Clustered Incident Feed */}
          <div className="incident-feed-col">
            {filteredIncidents.length === 0 ? (
              <div className="empty-reports">
                <p>No incidents found matching your query or filter.</p>
                <span>Try broadening your search or resetting category filters.</span>
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const mp = microProtests.find((p) => p.incident_id === incident.id);
                const isSelected = selectedIncident?.id === incident.id;

                return (
                  <motion.div
                    key={incident.id}
                    className={`incident-card-preview ${isSelected ? "active-card" : ""}`}
                    whileHover={{ y: -2 }}
                    onClick={() => handleOpenDetail(incident)}
                  >
                    <div className="card-top-row">
                      <div className="card-top-badges">
                        <span className={`status-pill ${incident.status?.toLowerCase()}`}>
                          {incident.status}
                        </span>
                        <span className="category-pill">{incident.category}</span>
                      </div>
                      <span className="priority-score-pill">
                        Priority: {((incident.priority_score || 0.75) * 100).toFixed(0)}%
                      </span>
                    </div>

                    <h3>{incident.title}</h3>

                    <div className="card-location-row">
                      <MapPin size={14} />
                      <span>{incident.location || "Sector Coordinate"}</span>
                    </div>

                    <p className="card-desc-snippet">
                      {incident.description.length > 140
                        ? incident.description.slice(0, 140) + "..."
                        : incident.description}
                    </p>

                    {/* Micro-Protest Banner if Active */}
                    {mp && mp.status === "ACTIVE" && (
                      <div className="card-protest-ticker">
                        <div className="protest-ticker-left">
                          <Users size={14} />
                          <span>{mp.support_count?.toLocaleString() || 0} Citizens Supporting Demand</span>
                        </div>
                        <div className="protest-ticker-right">
                          <TrendingUp size={13} />
                          <span>+{mp.velocity_6h || 12} (6h)</span>
                        </div>
                      </div>
                    )}

                    <div className="card-footer-row">
                      <span>
                        <Layers size={13} style={{ display: "inline", marginRight: "4px" }} />
                        <strong>{incident.count || 1}</strong> reports clustered
                      </span>

                      <button className="inspect-card-btn">
                        <span>Inspect Demand & Telemetry</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Incident Detail & Micro-Protest Modal */}
      <IncidentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        incident={selectedIncident}
        user={user}
        onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
      />

      {/* Citizen Aadhaar Verification Modal */}
      <VerifyModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        user={user}
        onVerified={() => {
          setIsVerified(true);
        }}
      />
    </div>
  );
}
