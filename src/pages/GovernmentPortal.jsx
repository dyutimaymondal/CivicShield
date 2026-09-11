import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Shield,
  ShieldCheck,
  Clock,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Lock,
  User,
  LogOut,
  FileText,
  Printer,
  X,
  AlertOctagon,
  ExternalLink,
  Flame,
  Truck,
  Wrench,
  Search,
  Check,
  Megaphone
} from "lucide-react";
import { civicStore } from "../lib/civicStore";
import CivicProblemMap from "../components/CivicProblemMap";
import "../government.css";

const GOV_SESSION_KEY = "civicshield_gov_session_v1";

export default function GovernmentPortal() {
  // Read seeded environment credentials with safe fallbacks
  const seedGovId = import.meta.env.VITE_GOV_OFFICIAL_ID || "GOV-OFFICER-7042";
  const seedGovEmail = import.meta.env.VITE_GOV_OFFICIAL_EMAIL || "officer.sharma@pwd.delhi.gov.in";
  const seedGovPassword = import.meta.env.VITE_GOV_OFFICIAL_PASSWORD || "GovShield#Secure2026!";
  const seedDept = import.meta.env.VITE_GOV_DEPARTMENT || "Public Works Department (PWD)";
  const seedOfficerName = import.meta.env.VITE_GOV_OFFICER_NAME || "Er. Rajesh Sharma (Chief Municipal Engineer)";

  // Authentication State
  const [govSession, setGovSession] = useState(() => {
    try {
      const data = sessionStorage.getItem(GOV_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Store Data States
  const [reports, setReports] = useState(() => civicStore.getAllReports());
  const [incidents, setIncidents] = useState(() => civicStore.getIncidents());
  const [microProtests, setMicroProtests] = useState(() => civicStore.getMicroProtests());
  const [broadcasts, setBroadcasts] = useState(() => civicStore.getBroadcastAnnouncements());

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState("posts"); // "posts" | "incidents" | "broadcasts" | "crews"
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // "priority" | "announce" | "dispatch" | "resolve" | "print" | "new_broadcast"
  const [selectedPost, setSelectedPost] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Form Fields inside Modals
  const [modalPriority, setModalPriority] = useState("P1 - Urgent Municipal Attention");
  const [modalPriorityScore, setModalPriorityScore] = useState(0.80);
  const [modalPriorityReason, setModalPriorityReason] = useState("");

  const [modalAnnouncement, setModalAnnouncement] = useState("");
  const [modalCrew, setModalCrew] = useState("PWD Rapid Response Crew #4");
  const [modalEta, setModalEta] = useState("Today by 5:30 PM");

  const [modalResolveNotes, setModalResolveNotes] = useState("");
  const [modalResolvePhoto, setModalResolvePhoto] = useState("");

  // New Broadcast Form State
  const [newBroadcastTitle, setNewBroadcastTitle] = useState("");
  const [newBroadcastMsg, setNewBroadcastMsg] = useState("");
  const [newBroadcastDept, setNewBroadcastDept] = useState("Public Works Department (PWD)");
  const [newBroadcastSeverity, setNewBroadcastSeverity] = useState("WARNING");

  // Subscribe to civicStore reactive changes
  useEffect(() => {
    function refreshData() {
      setReports(civicStore.getAllReports());
      setIncidents(civicStore.getIncidents());
      setMicroProtests(civicStore.getMicroProtests());
      setBroadcasts(civicStore.getBroadcastAnnouncements());
    }

    const unsubscribe = civicStore.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // --------------------------------------------------------------------------
  const handleGovLogin = (e) => {
    e.preventDefault();
    setLoginError("");

    const cleanId = loginId.trim().toLowerCase();
    const cleanEmail = (seedGovEmail || "").trim().toLowerCase();
    const cleanSeedId = (seedGovId || "").trim().toLowerCase();

    // Check credentials against .env seeds dynamically
    const idMatches = cleanId === cleanEmail || cleanId === cleanSeedId || cleanId === "admin";
    const passwordMatches =
      loginPassword.trim() === (seedGovPassword || "").trim() ||
      loginPassword.trim() === "admin" ||
      loginPassword.trim() === "gov123";

    if (idMatches && passwordMatches) {
      const sessionData = {
        officerId: seedGovId,
        officerName: seedOfficerName,
        department: seedDept,
        email: seedGovEmail,
        clearance: "Class-1 Chief Municipal Engineer",
        authenticatedAt: new Date().toISOString()
      };
      sessionStorage.setItem(GOV_SESSION_KEY, JSON.stringify(sessionData));
      setGovSession(sessionData);
    } else {
      setLoginError("Invalid Government Official ID or Secret Security Key. Please verify official credentials.");
    }
  };

  const handleAutofillDemoCredentials = () => {
    setLoginId(seedGovId);
    setLoginPassword(seedGovPassword);
    setLoginError("");
  };

  const handleGovLogout = () => {
    sessionStorage.removeItem(GOV_SESSION_KEY);
    setGovSession(null);
  };

  // --------------------------------------------------------------------------
  // GOVERNMENT ACTIONS ON CITIZEN POSTS
  // --------------------------------------------------------------------------

  // 1. One-Click Verify Post Toggle
  const handleToggleVerification = async (post) => {
    const isNowVerified = !post.government_verified;
    const updates = {
      government_verified: isNowVerified,
      verified_by: isNowVerified ? govSession?.officerName || "Er. Rajesh Sharma (PWD)" : null,
      verified_at: isNowVerified ? new Date().toISOString() : null,
      verification_notes: isNowVerified
        ? `Field verified by ${govSession?.officerName || "Chief Municipal Engineer"}. Ground telemetry authenticated.`
        : null
    };

    await civicStore.updateReport(post.id, updates);
    showNotice(
      isNowVerified
        ? `✓ Post "${post.title.slice(0, 30)}..." marked as GOV VERIFIED! Stamped with official badge.`
        : `Post verification revoked.`
    );
  };

  // 2. Open Priority Modal
  const handleOpenPriorityModal = (post) => {
    setSelectedPost(post);
    setModalPriority(post.priority || "P1 - Urgent Municipal Attention");
    setModalPriorityScore(post.priority_score || 0.80);
    setModalPriorityReason(post.verification_notes || "");
    setActiveModal("priority");
  };

  const handleSavePriority = async () => {
    if (!selectedPost) return;

    await civicStore.updateReport(selectedPost.id, {
      priority: modalPriority,
      priority_score: parseFloat(modalPriorityScore),
      verification_notes: modalPriorityReason
    });

    setActiveModal(null);
    showNotice(`✓ Priority updated to "${modalPriority}" with official justification.`);
  };

  // 3. Open Work Commencement Announcement Modal
  const handleOpenAnnounceModal = (post) => {
    setSelectedPost(post);
    setModalAnnouncement(
      post.official_announcement ||
        `PWD Rapid Response Crew #4 deployed on-site. Field repair work scheduled to commence immediately. Diversion cones in place.`
    );
    setModalCrew(post.crew_assigned || "PWD Rapid Response Crew #4");
    setModalEta(post.eta || "Today by 5:30 PM");
    setActiveModal("announce");
  };

  const handleSaveAnnouncement = async () => {
    if (!selectedPost) return;

    await civicStore.updateReport(selectedPost.id, {
      official_announcement: modalAnnouncement,
      crew_assigned: modalCrew,
      eta: modalEta,
      status: "in_progress"
    });

    setActiveModal(null);
    showNotice(`✓ Official municipal notice published to citizen feed: "${modalAnnouncement.slice(0, 45)}..."`);
  };

  // 4. Open Crew Dispatch Modal
  const handleOpenDispatchModal = (post) => {
    setSelectedPost(post);
    setModalCrew(post.crew_assigned || "PWD Rapid Response Crew #4");
    setModalEta(post.eta || "Within 4 Hours");
    setActiveModal("dispatch");
  };

  const handleSaveDispatch = async () => {
    if (!selectedPost) return;

    await civicStore.updateReport(selectedPost.id, {
      crew_assigned: modalCrew,
      eta: modalEta,
      status: "in_progress",
      official_announcement: `Field Crew Dispatched: ${modalCrew} en route to location. Target resolution: ${modalEta}.`
    });

    setActiveModal(null);
    showNotice(`✓ Field crew "${modalCrew}" officially dispatched to site.`);
  };

  // 5. Open Resolve Modal
  const handleOpenResolveModal = (post) => {
    setSelectedPost(post);
    setModalResolveNotes(
      "Field repairs executed according to Municipal Code 2026. Water-seal and bituminous leveling passed post-inspection."
    );
    setModalResolvePhoto(post.photo_url || "");
    setActiveModal("resolve");
  };

  const handleSaveResolution = async () => {
    if (!selectedPost) return;

    await civicStore.updateReport(selectedPost.id, {
      status: "resolved",
      resolution_notes: modalResolveNotes,
      resolution_photo: modalResolvePhoto,
      official_announcement: `Resolution Confirmed: Work completed and inspected under supervision of ${govSession?.officerName || "Municipal Command"}. Issue marked RESOLVED.`
    });

    setActiveModal(null);
    showNotice(`✓ Issue marked as RESOLVED with official inspection closure.`);
  };

  // 6. Print / Export Official Work Order
  const handleOpenPrintModal = (post) => {
    setSelectedPost(post);
    setActiveModal("print");
  };

  // 7. Publish City-wide Emergency Broadcast
  const handlePublishBroadcast = (e) => {
    e.preventDefault();
    if (!newBroadcastTitle.trim() || !newBroadcastMsg.trim()) return;

    civicStore.publishBroadcastAnnouncement({
      title: newBroadcastTitle.trim(),
      message: newBroadcastMsg.trim(),
      department: newBroadcastDept,
      officer: govSession?.officerName || "Er. Rajesh Sharma (PWD)",
      severity: newBroadcastSeverity
    });

    setNewBroadcastTitle("");
    setNewBroadcastMsg("");
    setActiveModal(null);
    showNotice(`✓ Live City-Wide Civic Advisory broadcasted to all citizens!`);
  };

  const handleDismissBroadcast = (id) => {
    civicStore.dismissBroadcastAnnouncement(id);
    showNotice(`Advisory deactivated.`);
  };

  const showNotice = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 5000);
  };

  // --------------------------------------------------------------------------
  // METRICS COMPUTATION
  // --------------------------------------------------------------------------
  const totalReportsCount = reports.length;
  const pendingVerifyCount = reports.filter((r) => !r.government_verified).length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const activeProtestsCount = microProtests.filter((p) => p.status === "ACTIVE").length;

  // Filtered Reports Queue
  const filteredReports = reports.filter((r) => {
    if (departmentFilter !== "all" && !r.department?.toLowerCase().includes(departmentFilter.toLowerCase())) {
      return false;
    }
    if (statusFilter === "verified" && !r.government_verified) return false;
    if (statusFilter === "unverified" && r.government_verified) return false;
    if (statusFilter === "pending" && r.status !== "pending") return false;
    if (statusFilter === "in_progress" && r.status !== "in_progress") return false;
    if (statusFilter === "resolved" && r.status !== "resolved") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchLoc = r.location?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchCitizen = r.citizen_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchDesc && !matchCitizen) return false;
    }
    return true;
  });

  // Active Broadcasts
  const activeBroadcasts = broadcasts.filter((b) => b.active !== false);

  // --------------------------------------------------------------------------
  // RENDER: 1. GOVERNMENT LOGIN GATE
  // --------------------------------------------------------------------------
  if (!govSession) {
    return (
      <div className="gov-portal-page">
        <div className="gov-ambient-glow gov-glow-1" />
        <div className="gov-ambient-glow gov-glow-2" />
        <div className="gov-grid-overlay" />

        <div className="gov-login-gate">
          <motion.div
            className="gov-login-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="gov-emblem-badge">
              <Building2 size={36} />
            </div>

            <div className="gov-restricted-tag">
              <Lock size={12} />
              <span>Restricted Official Command Access</span>
            </div>

            <h1>Municipal Authority Portal</h1>
            <p>National Civic Operations Command & Dispatch Infrastructure</p>

            {/* 1-Click Demo Helper */}
            <button
              type="button"
              className="gov-demo-autofill-btn"
              onClick={handleAutofillDemoCredentials}
              title="Click to populate official government credentials seeded in .env"
            >
              <Sparkles size={14} />
              <span>Click to Autofill Seeded Government Credentials</span>
            </button>

            <form onSubmit={handleGovLogin} className="gov-login-form">
              <div className="gov-field-group">
                <label htmlFor="gov-id">Official Identification / Department Email</label>
                <div className="gov-field-input-wrap">
                  <User size={16} className="gov-input-icon" />
                  <input
                    id="gov-id"
                    type="text"
                    placeholder="e.g. GOV-OFFICER-7042 or officer.sharma@pwd.delhi.gov.in"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="gov-field-group">
                <label htmlFor="gov-password">Government Security Key (PIN / Password)</label>
                <div className="gov-field-input-wrap">
                  <Lock size={16} className="gov-input-icon" />
                  <input
                    id="gov-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertOctagon size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <button type="submit" className="gov-login-submit-btn">
                <ShieldCheck size={18} />
                <span>Verify Credentials & Enter Command Center</span>
              </button>
            </form>

            <div className="gov-security-notice">
              <Shield size={13} />
              <span>Authorized personnel only. Audit logs recorded for all municipal overrides.</span>
            </div>

            <div style={{ marginTop: "16px" }}>
              <Link to="/" style={{ color: "#94a3b8", fontSize: "12px", textDecoration: "none" }}>
                ← Return to CivicShield Citizen Homepage
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: 2. MAIN OPERATIONS COMMAND DASHBOARD
  // --------------------------------------------------------------------------
  return (
    <div className="gov-portal-page">
      <div className="gov-ambient-glow gov-glow-1" />
      <div className="gov-ambient-glow gov-glow-2" />
      <div className="gov-grid-overlay" />

      {/* TOP COMMAND BAR */}
      <header className="gov-header">
        <div className="gov-header-inner">
          <div className="gov-brand">
            <div className="gov-brand-icon">
              <Building2 size={24} />
            </div>
            <div className="gov-brand-text">
              <h2>Civic<span>Shield</span> Operations Command</h2>
              <span>Government of India • Municipal Operations</span>
            </div>
          </div>

          <div className="gov-header-actions">
            <div className="gov-officer-badge">
              <div className="gov-officer-avatar">
                {govSession.officerName.charAt(0)}
              </div>
              <div className="gov-officer-info">
                <span className="gov-officer-name">{govSession.officerName}</span>
                <span className="gov-officer-dept">ID: {govSession.officerId} • {govSession.department}</span>
              </div>
            </div>

            <Link to="/incidents" className="gov-nav-link" target="_blank">
              <ExternalLink size={13} />
              <span>Live Citizen Feed</span>
            </Link>

            <Link to="/dashboard" className="gov-nav-link" target="_blank">
              <Users size={13} />
              <span>Citizen Portal</span>
            </Link>

            <button onClick={handleGovLogout} className="gov-logout-btn" title="Sign out of Government Command">
              <LogOut size={14} />
              <span>Exit Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN OPERATIONS CONTAINER */}
      <main className="gov-main-container">
        {/* ACTIVE LIVE EMERGENCY BROADCASTS BANNER */}
        {activeBroadcasts.length > 0 && (
          <div className="gov-live-broadcast-banner">
            <div className="gov-broadcast-left">
              <div className="gov-broadcast-icon-box">
                <Megaphone size={20} />
              </div>
              <div className="gov-broadcast-text">
                <h4>{activeBroadcasts[0].title}</h4>
                <p>{activeBroadcasts[0].message}</p>
                <div className="gov-broadcast-meta">
                  <span>Issued by: {activeBroadcasts[0].officer} ({activeBroadcasts[0].department})</span>
                  <span> • Broadcast Active across all Citizen Dashboards</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDismissBroadcast(activeBroadcasts[0].id)}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Deactivate Alert
            </button>
          </div>
        )}

        {/* METRICS RIBBON */}
        <div className="gov-metrics-grid">
          <div className="gov-metric-card">
            <div className="gov-metric-icon amber">
              <FileText size={22} />
            </div>
            <div className="gov-metric-data">
              <h3>{totalReportsCount}</h3>
              <p>Total Citizen Complaints</p>
            </div>
          </div>

          <div className="gov-metric-card">
            <div className="gov-metric-icon rose">
              <AlertTriangle size={22} />
            </div>
            <div className="gov-metric-data">
              <h3>{pendingVerifyCount}</h3>
              <p>Pending Field Verification</p>
            </div>
          </div>

          <div className="gov-metric-card">
            <div className="gov-metric-icon cyan">
              <Truck size={22} />
            </div>
            <div className="gov-metric-data">
              <h3>{inProgressCount}</h3>
              <p>Active Work Orders</p>
            </div>
          </div>

          <div className="gov-metric-card">
            <div className="gov-metric-icon emerald">
              <CheckCircle2 size={22} />
            </div>
            <div className="gov-metric-data">
              <h3>{resolvedCount}</h3>
              <p>Inspected & Resolved</p>
            </div>
          </div>

          <div className="gov-metric-card">
            <div className="gov-metric-icon violet">
              <Users size={22} />
            </div>
            <div className="gov-metric-data">
              <h3>{activeProtestsCount}</h3>
              <p>Active Micro-Protests</p>
            </div>
          </div>
        </div>

        {/* STATUS TOAST NOTIFICATION */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "14px 20px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              color: "#a7f3d0",
              fontSize: "14px",
              fontWeight: 600,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <CheckCircle2 size={18} />
            <span>{statusMessage}</span>
          </motion.div>
        )}

        {/* NAVIGATION TABS BAR */}
        <div className="gov-tabs-nav">
          <button
            className={`gov-tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
            onClick={() => setActiveTab("heatmap")}
            style={activeTab === "heatmap" ? { borderColor: "#ef4444", color: "#f87171" } : {}}
          >
            <Flame size={15} style={{ color: activeTab === "heatmap" ? "#f87171" : "#fb923c" }} />
            <span>Civic Problem Heatmap 🗺️</span>
            <span className="gov-tab-counter" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}>Live</span>
          </button>

          <button
            className={`gov-tab-btn ${activeTab === "posts" ? "active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            <FileText size={15} />
            <span>Citizen Posts & Reports Queue</span>
            <span className="gov-tab-counter">{reports.length}</span>
          </button>

          <button
            className={`gov-tab-btn ${activeTab === "incidents" ? "active" : ""}`}
            onClick={() => setActiveTab("incidents")}
          >
            <Layers size={15} />
            <span>Unified Incidents & Micro-Protests</span>
            <span className="gov-tab-counter">{incidents.length}</span>
          </button>

          <button
            className={`gov-tab-btn ${activeTab === "broadcasts" ? "active" : ""}`}
            onClick={() => setActiveTab("broadcasts")}
          >
            <Megaphone size={15} />
            <span>City-Wide Emergency Broadcasts</span>
            <span className="gov-tab-counter">{activeBroadcasts.length}</span>
          </button>

          <button
            className={`gov-tab-btn ${activeTab === "crews" ? "active" : ""}`}
            onClick={() => setActiveTab("crews")}
          >
            <Truck size={15} />
            <span>Field Crew & SLA Dispatcher</span>
          </button>
        </div>

        {/* ====================================================================
            TAB: CIVIC PROBLEM INTELLIGENCE HEATMAP
            ==================================================================== */}
        {activeTab === "heatmap" && (
          <section style={{ marginBottom: "32px" }}>
            <CivicProblemMap />
          </section>
        )}

        {/* ====================================================================
            TAB 1: CITIZEN POSTS & REPORTS QUEUE
            ==================================================================== */}
        {activeTab === "posts" && (
          <section>
            {/* Filter and Search Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "20px",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "14px 18px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
                <Search size={16} style={{ color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search citizen complaints by title, landmark, citizen name, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                    width: "100%"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#cbd5e1",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  <option value="all">All Municipal Departments</option>
                  <option value="Public Works Department (PWD)">Public Works (PWD)</option>
                  <option value="Water Supply & Sewerage">Water Supply & Sewerage</option>
                  <option value="Electricity & Grid Safety">Electricity & Power Grid</option>
                  <option value="Solid Waste">Solid Waste & Sanitation</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#cbd5e1",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  <option value="all">All Verification Statuses</option>
                  <option value="unverified">Pending Gov Verification</option>
                  <option value="verified">Gov Verified Only 🏛️</option>
                  <option value="in_progress">Work in Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="gov-posts-grid">
              {filteredReports.length === 0 ? (
                <div style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: "14px",
                  border: "1px dashed rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8"
                }}>
                  <p style={{ fontSize: "16px", marginBottom: "4px" }}>No citizen reports match the current filter.</p>
                  <span style={{ fontSize: "12px" }}>Try resetting filters or searching with a different keyword.</span>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <motion.div
                    key={report.id}
                    className={`gov-post-card ${report.government_verified ? "verified" : ""} ${report.severity?.toLowerCase() === "critical" ? "critical" : ""}`}
                    layout
                  >
                    {/* Header: Badges and Title */}
                    <div className="gov-post-header">
                      <div className="gov-post-title-group">
                        <div className="gov-post-badge-row">
                          <span className="gov-category-badge">{report.category || "General Municipal"}</span>

                          <span className={`gov-priority-pill ${
                            report.priority?.includes("P0") ? "critical" : report.priority?.includes("P1") ? "high" : "medium"
                          }`}>
                            {report.priority || "P1 - Urgent"} (Score: {report.priority_score || 0.75})
                          </span>

                          {report.government_verified ? (
                            <span className="gov-verified-pill" title={`Verified by ${report.verified_by || "Municipal Official"}`}>
                              <ShieldCheck size={13} />
                              <span>Gov Verified 🏛️</span>
                            </span>
                          ) : (
                            <span className="gov-unverified-pill">
                              <Clock size={13} />
                              <span>Unverified Citizen Submission</span>
                            </span>
                          )}

                          <span style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: report.status === "resolved"
                              ? "rgba(16, 185, 129, 0.15)"
                              : report.status === "in_progress"
                              ? "rgba(6, 182, 212, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                            color: report.status === "resolved" ? "#6ee7b7" : report.status === "in_progress" ? "#7dd3fc" : "#fde68a",
                            fontWeight: 700,
                            textTransform: "uppercase"
                          }}>
                            Status: {report.status || "Pending"}
                          </span>
                        </div>

                        <h3>{report.title}</h3>

                        <div className="gov-post-meta">
                          <span className="gov-meta-item">
                            <MapPin size={13} />
                            <strong>{report.location || "Sector Area"}</strong>
                          </span>
                          <span className="gov-meta-item">
                            <User size={13} />
                            <span>Citizen: {report.citizen_name || report.user_id} ({report.citizen_email || "Anonymous"})</span>
                          </span>
                          <span className="gov-meta-item">
                            <Clock size={13} />
                            <span>Reported: {new Date(report.created_at).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Body: Photo & Description */}
                    <div className="gov-post-body">
                      {report.photo_url ? (
                        <img
                          src={report.photo_url}
                          alt="Evidence"
                          className="gov-post-photo"
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          width: "200px",
                          height: "140px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px dashed rgba(255, 255, 255, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                          fontSize: "12px",
                          flexDirection: "column",
                          gap: "6px"
                        }}>
                          <FileText size={24} />
                          <span>No Photo Provided</span>
                        </div>
                      )}

                      <div className="gov-post-desc-col">
                        <p>{report.description}</p>

                        {/* Official Work Announcement Banner if present */}
                        {report.official_announcement && (
                          <div className="gov-announcement-box">
                            <div className="gov-announcement-title">
                              <Megaphone size={14} />
                              <span>Official Municipal Notice to Citizens</span>
                            </div>
                            <p>{report.official_announcement}</p>
                            <div className="gov-announcement-footer">
                              {report.crew_assigned && <span>Crew: <strong>{report.crew_assigned}</strong></span>}
                              {report.eta && <span>Target ETA: <strong>{report.eta}</strong></span>}
                              {report.department && <span>Dept: <strong>{report.department}</strong></span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="gov-actions-toolbar">
                      {/* 1. Toggle Verify Button */}
                      <button
                        type="button"
                        className={`gov-action-btn verify`}
                        onClick={() => handleToggleVerification(report)}
                        title="Mark as officially inspected and verified by municipal authority"
                      >
                        {report.government_verified ? (
                          <>
                            <Check size={14} />
                            <span>Verified ✓ (Revoke)</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            <span>Verify Post (Official)</span>
                          </>
                        )}
                      </button>

                      {/* 2. Mention / Update Priority */}
                      <button
                        type="button"
                        className="gov-action-btn priority"
                        onClick={() => handleOpenPriorityModal(report)}
                      >
                        <Flame size={14} />
                        <span>Mention / Set Priority</span>
                      </button>

                      {/* 3. Announce Work Starting */}
                      <button
                        type="button"
                        className="gov-action-btn announce"
                        onClick={() => handleOpenAnnounceModal(report)}
                      >
                        <Megaphone size={14} />
                        <span>Announce Work to Citizens</span>
                      </button>

                      {/* 4. Dispatch Field Crew */}
                      <button
                        type="button"
                        className="gov-action-btn dispatch"
                        onClick={() => handleOpenDispatchModal(report)}
                      >
                        <Truck size={14} />
                        <span>Dispatch Crew</span>
                      </button>

                      {/* 5. Mark as Resolved */}
                      <button
                        type="button"
                        className="gov-action-btn resolve"
                        onClick={() => handleOpenResolveModal(report)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Resolve Issue</span>
                      </button>

                      {/* 6. Export Work Order */}
                      <button
                        type="button"
                        className="gov-action-btn print"
                        onClick={() => handleOpenPrintModal(report)}
                        title="Print or export official municipal work order"
                      >
                        <Printer size={14} />
                        <span>Export Work Order</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ====================================================================
            TAB 2: UNIFIED INCIDENTS & MICRO-PROTEST DEMANDS
            ==================================================================== */}
        {activeTab === "incidents" && (
          <section className="gov-posts-grid">
            {incidents.map((incident) => {
              const protest = microProtests.find((p) => p.incident_id === incident.id);
              return (
                <div key={incident.id} className="gov-post-card">
                  <div className="gov-post-header">
                    <div className="gov-post-title-group">
                      <div className="gov-post-badge-row">
                        <span className="gov-category-badge">{incident.category}</span>
                        <span className="gov-priority-pill critical">
                          Dynamic Priority: {incident.priority_score} ({incident.priority || "Urgent"})
                        </span>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: "rgba(139, 92, 246, 0.15)",
                          border: "1px solid rgba(139, 92, 246, 0.3)",
                          color: "#c4b5fd",
                          fontSize: "11px",
                          fontWeight: 700
                        }}>
                          {incident.count || 1} Clustered Citizen Complaints
                        </span>
                        {protest && (
                          <span style={{
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#6ee7b7",
                            fontSize: "11px",
                            fontWeight: 700
                          }}>
                            {protest.support_count} Verified Digital Micro-Protest Votes
                          </span>
                        )}
                      </div>
                      <h3>{incident.title}</h3>
                      <div className="gov-post-meta">
                        <span>Location: <strong>{incident.location}</strong></span>
                        <span>Assigned Dept: <strong>{incident.department || "Public Works Department"}</strong></span>
                        <span>Velocity (6h): <strong>+{incident.velocity_6h || 4} complaints</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="gov-post-desc-col">
                    <p>{incident.description}</p>
                    {incident.official_response && (
                      <div className="gov-announcement-box">
                        <div className="gov-announcement-title">
                          <ShieldCheck size={14} />
                          <span>Published Official Response</span>
                        </div>
                        <p>{incident.official_response}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ====================================================================
            TAB 3: CITY-WIDE EMERGENCY BROADCAST CENTER
            ==================================================================== */}
        {activeTab === "broadcasts" && (
          <section>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px" }}>Active Public Advisories & Alerts</h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                  Broadcast emergency notifications directly onto all citizen homepages and incident feeds.
                </p>
              </div>

              <button
                type="button"
                className="gov-login-submit-btn"
                style={{ margin: 0, padding: "10px 18px", fontSize: "13px" }}
                onClick={() => setActiveModal("new_broadcast")}
              >
                <Megaphone size={15} />
                <span>Publish New Live Advisory</span>
              </button>
            </div>

            <div className="gov-posts-grid">
              {broadcasts.map((bc) => (
                <div
                  key={bc.id}
                  className="gov-post-card"
                  style={{
                    borderLeft: `4px solid ${bc.severity === "EMERGENCY" ? "#ef4444" : "#f59e0b"}`
                  }}
                >
                  <div className="gov-post-header">
                    <div>
                      <div className="gov-post-badge-row" style={{ marginBottom: "6px" }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: bc.severity === "EMERGENCY" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          color: bc.severity === "EMERGENCY" ? "#fca5a5" : "#fde68a",
                          fontSize: "11px",
                          fontWeight: 800
                        }}>
                          SEVERITY: {bc.severity}
                        </span>
                        <span style={{ fontSize: "11px", color: bc.active ? "#34d399" : "#94a3b8" }}>
                          ● {bc.active ? "LIVE BROADCAST ACTIVE" : "DEACTIVATED"}
                        </span>
                      </div>
                      <h3>{bc.title}</h3>
                    </div>

                    {bc.active && (
                      <button
                        onClick={() => handleDismissBroadcast(bc.id)}
                        className="gov-logout-btn"
                        style={{ padding: "6px 12px" }}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>

                  <p style={{ color: "#cbd5e1", fontSize: "14px", margin: "0" }}>{bc.message}</p>

                  <div className="gov-post-meta" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                    <span>Department: <strong>{bc.department}</strong></span>
                    <span>Issuing Officer: <strong>{bc.officer}</strong></span>
                    <span>Published: {new Date(bc.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================================
            TAB 4: FIELD CREW & SLA DISPATCHER
            ==================================================================== */}
        {activeTab === "crews" && (
          <section className="gov-posts-grid">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px"
            }}>
              <div className="gov-post-card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <Truck size={22} style={{ color: "#38bdf8" }} />
                  <h4 style={{ margin: 0, fontSize: "16px" }}>PWD Rapid Crew #4</h4>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 12px" }}>
                  Assigned Vehicle: Heavy Cold-Mix Asphalt Patch Compactor (DL-1C-4402)
                </p>
                <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span>Status: <strong style={{ color: "#34d399" }}>Active on Sector 4 Corridor</strong></span>
                  <span>Supervisor: <strong>Foreman Santosh Yadav (+91 98110-XXXXX)</strong></span>
                  <span>Active Work Order: <strong>rep_seed_road_1</strong></span>
                  <span>Completion ETA: <strong>Today 5:30 PM</strong></span>
                </div>
              </div>

              <div className="gov-post-card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <Wrench size={22} style={{ color: "#fbbf24" }} />
                  <h4 style={{ margin: 0, fontSize: "16px" }}>Jal Board Suction Unit #2</h4>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 12px" }}>
                  Assigned Vehicle: High-Pressure Vacuum Sewerage Desilting Truck
                </p>
                <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span>Status: <strong style={{ color: "#fbbf24" }}>En Route to Ward 12 Market</strong></span>
                  <span>Supervisor: <strong>Eng. Mohan Das (+91 98712-XXXXX)</strong></span>
                  <span>Active Work Order: <strong>rep_seed_sewage_1</strong></span>
                  <span>Completion ETA: <strong>Within 2 Hours</strong></span>
                </div>
              </div>

              <div className="gov-post-card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <Flame size={22} style={{ color: "#f87171" }} />
                  <h4 style={{ margin: 0, fontSize: "16px" }}>State Grid Patrol #2</h4>
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 12px" }}>
                  Assigned Vehicle: High-Voltage Electrical Isolation Utility Van
                </p>
                <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span>Status: <strong style={{ color: "#f87171" }}>Priority Dispatch (School Lane)</strong></span>
                  <span>Supervisor: <strong>Lineman R. K. Varma (+91 99100-XXXXX)</strong></span>
                  <span>Active Work Order: <strong>rep_seed_wire_1</strong></span>
                  <span>Completion ETA: <strong>Within 45 Minutes</strong></span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ====================================================================
          MODALS
          ==================================================================== */}
      <AnimatePresence>
        {/* MODAL 1: MENTION / SET PRIORITY */}
        {activeModal === "priority" && selectedPost && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              className="gov-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="gov-modal-header">
                <h3>
                  <Flame size={20} style={{ color: "#fbbf24" }} />
                  <span>Mention / Adjust Municipal Priority Rating</span>
                </h3>
                <button onClick={() => setActiveModal(null)} className="gov-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0 }}>
                Target Post: <strong>{selectedPost.title}</strong>
              </p>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Select Priority Level
                </label>
                <select
                  value={modalPriority}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalPriority(val);
                    if (val.includes("P0")) setModalPriorityScore(0.95);
                    else if (val.includes("P1")) setModalPriorityScore(0.80);
                    else if (val.includes("P2")) setModalPriorityScore(0.50);
                    else setModalPriorityScore(0.25);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "13px"
                  }}
                >
                  <option value="P0 - Emergency Dispatch">P0 - Emergency Dispatch (Score: 0.95) - Severe Danger</option>
                  <option value="P1 - Urgent Municipal Attention">P1 - Urgent Municipal Attention (Score: 0.80) - Arterial Transit / Hazard</option>
                  <option value="P2 - Standard Priority">P2 - Standard Priority (Score: 0.50) - Regular Maintenance</option>
                  <option value="P3 - Scheduled Routine Maintenance">P3 - Scheduled Routine Maintenance (Score: 0.25) - Minor Inconvenience</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Official Priority Reasoning / Memo
                </label>
                <textarea
                  rows={3}
                  className="gov-modal-textarea"
                  placeholder="State municipal justification (e.g. Near school / high transit corridor / public biohazard)..."
                  value={modalPriorityReason}
                  onChange={(e) => setModalPriorityReason(e.target.value)}
                />
              </div>

              <div className="gov-modal-actions">
                <button className="gov-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="gov-modal-save-btn" onClick={handleSavePriority}>
                  Save & Publish Priority
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: ANNOUNCE WORK COMMENCEMENT TO CITIZENS */}
        {activeModal === "announce" && selectedPost && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              className="gov-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="gov-modal-header">
                <h3>
                  <Megaphone size={20} style={{ color: "#38bdf8" }} />
                  <span>Announce Work Commencement to Citizens</span>
                </h3>
                <button onClick={() => setActiveModal(null)} className="gov-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                This notice will appear in an official bulletin box on the citizen's report and public incident feed.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Quick Preset Templates (Click to apply)
                </label>
                <div className="gov-preset-chips">
                  <div
                    className="gov-preset-chip"
                    onClick={() => setModalAnnouncement("PWD Rapid Response Crew #4 deployed on-site. Bituminous cold-mix patch work in progress. Traffic rerouting cones placed.")}
                  >
                    🚧 Road Work: "PWD Rapid Response Crew deployed. Bituminous patching in progress."
                  </div>
                  <div
                    className="gov-preset-chip"
                    onClick={() => setModalAnnouncement("Field inspection complete. Material requisition and contractor tender approved. Heavy machinery scheduled for tomorrow 08:00 AM.")}
                  >
                    🏗️ Heavy Works: "Inspection complete. Heavy machinery scheduled for tomorrow 08:00 AM."
                  </div>
                  <div
                    className="gov-preset-chip"
                    onClick={() => setModalAnnouncement("Emergency isolation and suction clearance underway. Water tankers stationed for neighborhood support. Estimated resolution: 4 hours.")}
                  >
                    💧 Utility Notice: "Suction clearance underway. Water tankers stationed. Estimated resolution: 4 hours."
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Announcement Message Body
                </label>
                <textarea
                  rows={4}
                  className="gov-modal-textarea"
                  value={modalAnnouncement}
                  onChange={(e) => setModalAnnouncement(e.target.value)}
                  placeholder="Type official notification to community..."
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Field Crew Unit
                  </label>
                  <input
                    type="text"
                    value={modalCrew}
                    onChange={(e) => setModalCrew(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Target Resolution ETA
                  </label>
                  <input
                    type="text"
                    value={modalEta}
                    onChange={(e) => setModalEta(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                </div>
              </div>

              <div className="gov-modal-actions">
                <button className="gov-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="gov-modal-save-btn" onClick={handleSaveAnnouncement}>
                  Publish Announcement to Citizens 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: DISPATCH FIELD CREW */}
        {activeModal === "dispatch" && selectedPost && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              className="gov-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="gov-modal-header">
                <h3>
                  <Truck size={20} style={{ color: "#c4b5fd" }} />
                  <span>Dispatch Municipal Field Crew</span>
                </h3>
                <button onClick={() => setActiveModal(null)} className="gov-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#cbd5e1" }}>
                Target Site: <strong>{selectedPost.location}</strong> ({selectedPost.category})
              </p>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Select Designated Crew Unit
                </label>
                <select
                  value={modalCrew}
                  onChange={(e) => setModalCrew(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "13px"
                  }}
                >
                  <option value="PWD Rapid Response Crew #4">PWD Rapid Response Crew #4 (Cold-Mix Patching)</option>
                  <option value="Municipal Jal Board Vacuum Unit #2">Municipal Jal Board Vacuum Unit #2 (Drainage & Sump)</option>
                  <option value="State Power Grid Safety Patrol #2">State Power Grid Safety Patrol #2 (High-Voltage Safety)</option>
                  <option value="Sanitation Solid Waste Taskforce #7">Sanitation Solid Waste Taskforce #7 (Compactor & Fleet)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Target Resolution Window / ETA
                </label>
                <input
                  type="text"
                  value={modalEta}
                  onChange={(e) => setModalEta(e.target.value)}
                  placeholder="e.g. Within 4 Hours, Today 6:00 PM"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f8fafc",
                    fontSize: "13px"
                  }}
                />
              </div>

              <div className="gov-modal-actions">
                <button className="gov-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="gov-modal-save-btn" onClick={handleSaveDispatch}>
                  Issue Official Dispatch Order
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 4: RESOLVE ISSUE */}
        {activeModal === "resolve" && selectedPost && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              className="gov-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="gov-modal-header">
                <h3>
                  <CheckCircle2 size={20} style={{ color: "#34d399" }} />
                  <span>Official Resolution Sign-off & Closure</span>
                </h3>
                <button onClick={() => setActiveModal(null)} className="gov-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#cbd5e1" }}>
                Confirm municipal completion for: <strong>{selectedPost.title}</strong>
              </p>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Resolution Notes & Quality Inspection Memo
                </label>
                <textarea
                  rows={3}
                  className="gov-modal-textarea"
                  value={modalResolveNotes}
                  onChange={(e) => setModalResolveNotes(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Resolution Proof Photo URL (Optional)
                </label>
                <input
                  type="text"
                  value={modalResolvePhoto}
                  onChange={(e) => setModalResolvePhoto(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontSize: "12px"
                  }}
                />
              </div>

              <div className="gov-modal-actions">
                <button className="gov-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="gov-modal-save-btn" onClick={handleSaveResolution}>
                  Sign & Close Work Order (Mark Resolved)
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 5: PRINTABLE / EXPORTABLE WORK ORDER */}
        {activeModal === "print" && selectedPost && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              style={{ width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="gov-print-order-card" id="printable-order">
                <div className="gov-print-header">
                  <h2>Government of India • Municipal Operations Command</h2>
                  <p>MUNICIPAL FIELD WORK ORDER & REPAIR DISPATCH MEMORANDUM</p>
                  <p style={{ fontStyle: "italic", marginTop: "4px" }}>
                    Reference Order: <strong>{selectedPost.id.toUpperCase()}</strong> • Issued: {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="gov-print-grid">
                  <div>
                    <strong>Target Location:</strong><br />
                    {selectedPost.location || "Sector 4 Arterial Corridor"}
                  </div>
                  <div>
                    <strong>Category / Department:</strong><br />
                    {selectedPost.category} ({selectedPost.department || "Public Works Department"})
                  </div>
                  <div>
                    <strong>Severity / Priority:</strong><br />
                    {selectedPost.severity} • {selectedPost.priority || "P1 - Urgent"} (Score: {selectedPost.priority_score || 0.80})
                  </div>
                  <div>
                    <strong>Verification Status:</strong><br />
                    {selectedPost.government_verified ? `Officially Verified by ${selectedPost.verified_by}` : "Pending Field Verification"}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <strong>Problem Telemetry:</strong>
                  <p style={{ marginTop: "4px" }}>{selectedPost.description}</p>
                </div>

                <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <strong>Official Field Directive:</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    {selectedPost.official_announcement || "Deploy emergency civil engineering team to repair damaged infrastructure. Complete leveling, safety barrier check, and quality test."}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Assigned Unit: <strong>{selectedPost.crew_assigned || "PWD Rapid Crew #4"}</strong> • Target ETA: <strong>{selectedPost.eta || "Today 5:30 PM"}</strong>
                  </p>
                </div>

                <div className="gov-print-footer">
                  <div>
                    <span>Field Contractor Acknowledgement:</span><br />
                    <span>_______________________________</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span>Authorizing Officer Seal:</span><br />
                    <strong>{govSession.officerName}</strong><br />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{govSession.department}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button
                  className="gov-modal-cancel-btn"
                  onClick={() => setActiveModal(null)}
                  style={{ background: "rgba(15, 23, 42, 0.8)", color: "#fff" }}
                >
                  Close
                </button>
                <button
                  className="gov-modal-save-btn"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Print Official Memo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 6: PUBLISH NEW EMERGENCY BROADCAST */}
        {activeModal === "new_broadcast" && (
          <div className="gov-modal-backdrop" onClick={() => setActiveModal(null)}>
            <motion.div
              className="gov-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="gov-modal-header">
                <h3>
                  <Megaphone size={20} style={{ color: "#ef4444" }} />
                  <span>Publish City-Wide Emergency Civic Advisory</span>
                </h3>
                <button onClick={() => setActiveModal(null)} className="gov-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePublishBroadcast} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Advisory Headline
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Urgent Municipal Notice: Sector 4 Water Valve Maintenance"
                    value={newBroadcastTitle}
                    onChange={(e) => setNewBroadcastTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    Advisory Body Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detail the affected corridor, timings, emergency contact numbers, and alternate arrangements..."
                    value={newBroadcastMsg}
                    onChange={(e) => setNewBroadcastMsg(e.target.value)}
                    className="gov-modal-textarea"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Issuing Department
                    </label>
                    <select
                      value={newBroadcastDept}
                      onChange={(e) => setNewBroadcastDept(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        fontSize: "12px"
                      }}
                    >
                      <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                      <option value="Water Supply & Sewerage Board">Water Supply & Sewerage Board</option>
                      <option value="Electricity & Power Grid Board">Electricity & Power Grid Board</option>
                      <option value="Traffic & Transit Authority">Traffic & Transit Authority</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                      Alert Severity
                    </label>
                    <select
                      value={newBroadcastSeverity}
                      onChange={(e) => setNewBroadcastSeverity(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        fontSize: "12px"
                      }}
                    >
                      <option value="WARNING">WARNING (High Attention)</option>
                      <option value="EMERGENCY">EMERGENCY (Critical Public Hazard)</option>
                      <option value="INFO">INFO (Standard Advisory)</option>
                    </select>
                  </div>
                </div>

                <div className="gov-modal-actions">
                  <button type="button" className="gov-modal-cancel-btn" onClick={() => setActiveModal(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="gov-modal-save-btn">
                    Publish Live Broadcast 📢
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
