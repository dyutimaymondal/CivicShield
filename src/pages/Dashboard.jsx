import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  LogOut,
  FileText,
  Clock,
  CheckCircle2,
  Activity,
  Sparkles,
  MapPin,
  Tag,
  UploadCloud,
  X,
  Send,
  Loader2,
  AlertCircle,
  Bot,
  Calendar,
  Inbox,
  AlertTriangle,
  Layers,
  Users,
  Building2,
  Navigation,
  ArrowRight,
  Megaphone
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { authStore } from "../lib/authStore";
import { rateLimiter, sanitizeInput, validateImageFile } from "../lib/security";
import { civicStore } from "../lib/civicStore";
import { verificationService } from "../lib/verificationService";
import VerifyModal from "../components/VerifyModal";
import ThemeToggle from "../components/ThemeToggle";
import "../dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [photo, setPhoto] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [message, setMessage] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [filter, setFilter] = useState("all");

  const [isVerified, setIsVerified] = useState(false);
  const [_verificationRecord, setVerificationRecord] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const [activeBroadcasts, setActiveBroadcasts] = useState(() => civicStore.getActiveBroadcastAnnouncements());

  // Get logged-in user & enforce strict authentication
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const session = await authStore.getActiveSession();
      if (!session || !session.user) {
        navigate("/login", { replace: true });
        return;
      }

      if (isMounted) {
        setUser(session.user);
        const v = verificationService.getVerificationStatus(session.user.id);
        setIsVerified(v.isVerified);
        setVerificationRecord(v);
        fetchReports(session.user.id);

        // Check if onboarding prompt should be displayed
        const urlParams = new URLSearchParams(window.location.search);
        const promptParam = urlParams.get("promptVerify");
        const promptStorage = sessionStorage.getItem("civicshield_prompt_verify");

        if ((promptParam === "true" || promptStorage === "true") && !v.isVerified) {
          setShowOnboardingPrompt(true);
          sessionStorage.removeItem("civicshield_prompt_verify");
          // Clean URL query param without refreshing
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (isMounted) {
          setUser(session.user);
          authStore.setStoredSession(session);
        }
      } else {
        const stored = authStore.getStoredSession();
        if (!stored && isMounted) {
          setUser(null);
          navigate("/login", { replace: true });
        }
      }
    });

    const handleVerifyEvent = (e) => {
      setIsVerified(e.detail?.isVerified || false);
      setVerificationRecord(e.detail);
    };
    window.addEventListener("civicshield_verification_updated", handleVerifyEvent);

    // Initial background sync from Supabase
    civicStore.syncFromSupabase().catch(() => {});

    const handleReportsUpdate = () => {
      if (isMounted) {
        setActiveBroadcasts(civicStore.getActiveBroadcastAnnouncements());
        const sess = authStore.getStoredSession();
        if (sess?.user?.id) {
          fetchReports(sess.user.id);
        }
      }
    };

    window.addEventListener("civicshield_reports_updated", handleReportsUpdate);

    const unsubscribeStore = civicStore.subscribe(() => {
      if (isMounted) {
        setActiveBroadcasts(civicStore.getActiveBroadcastAnnouncements());
        const sess = authStore.getStoredSession();
        if (sess?.user?.id) {
          fetchReports(sess.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      unsubscribeStore();
      window.removeEventListener("civicshield_verification_updated", handleVerifyEvent);
      window.removeEventListener("civicshield_reports_updated", handleReportsUpdate);
    };
  }, [navigate]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocation("Sector V, Salt Lake, Kolkata (Manual Entry)");
      setCoords({ latitude: 22.5735, longitude: 88.4331 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCoords({ latitude: lat, longitude: lng });
        setLocation(`GPS Geofence [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
      },
      () => {
        const simLat = parseFloat((22.5726 + (Math.random() - 0.5) * 0.03).toFixed(6));
        const simLng = parseFloat((88.3639 + (Math.random() - 0.5) * 0.03).toFixed(6));
        setCoords({ latitude: simLat, longitude: simLng });
        setLocation(`Kolkata Central Corridor [${simLat.toFixed(4)}, ${simLng.toFixed(4)}]`);
      }
    );
  };

  // Fetch user's reports isolated by userId with merged local and Supabase telemetry
  async function fetchReports(userId) {
    if (!userId) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);

    try {
      const localUserReports = civicStore.getUserReports(userId);
      const combinedMap = new Map();
      localUserReports.forEach((r) => combinedMap.set(String(r.id), r));

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach((r) => {
          const rawLng = r.longtitude !== undefined && r.longtitude !== null ? r.longtitude : r.longitude;
          const normalized = {
            ...r,
            longitude: typeof rawLng === "number" ? rawLng : parseFloat(rawLng),
            latitude: typeof r.latitude === "number" ? r.latitude : parseFloat(r.latitude),
            government_verified: r.status === "verified" || r.status === "in_progress" || r.status === "resolved",
            verified_by: r.authority_note || "Municipal Authority"
          };
          const existing = combinedMap.get(String(r.id));
          combinedMap.set(String(r.id), existing ? { ...existing, ...normalized } : normalized);
        });
      }

      setReports(
        Array.from(combinedMap.values()).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      );
    } catch {
      const localUserReports = civicStore.getUserReports(userId);
      setReports(localUserReports);
    } finally {
      setLoadingReports(false);
    }
  }

  // Secure Photo Selection & Validation
  const handlePhotoSelect = (file) => {
    if (!file) {
      setPhoto(null);
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setMessage(`Security Alert: ${validation.error}`);
      setPhoto(null);
      const fileInput = document.getElementById("report-photo");
      if (fileInput) fileInput.value = "";
      return;
    }

    setMessage("");
    setPhoto(file);
  };

  // Submit report
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setAnalysis(null);

    // Sanitize user inputs to prevent SQL / Script injections
    const cleanTitle = sanitizeInput(title, 150);
    const cleanDescription = sanitizeInput(description, 3000);
    const cleanLocation = sanitizeInput(location, 150);

    if (!cleanDescription.trim()) {
      setMessage("Please enter a complaint description.");
      return;
    }

    if (!user) {
      setMessage("Please login first.");
      return;
    }

    // Rate-limit report submissions (anti-flood: max 1 report every 15s per citizen)
    const cooldown = rateLimiter.checkCooldown(`report_submit_${user.id}`, 15);
    if (!cooldown.allowed) {
      setMessage(`Submission rate limit: please wait ${cooldown.remainingSeconds}s before submitting another report.`);
      return;
    }

    setLoading(true);

    try {
      // --------------------------------
      // STEP 1: AI ANALYSIS (Edge Function with Fallback)
      // --------------------------------
      let aiData = null;
      try {
        const { data: edgeAi, error: aiError } =
          await supabase.functions.invoke("analyze-report", {
            body: {
              description: cleanDescription,
            },
          });

        if (!aiError && edgeAi && !edgeAi.error) {
          aiData = edgeAi;
        }
      } catch (e) {
        console.warn("Edge function note:", e.message);
      }

      // --------------------------------
      // STEP 2: UPLOAD PHOTO (MIME & Size Verified)
      // --------------------------------
      let photoUrl = "";

      if (photo) {
        const validation = validateImageFile(photo);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const safeExtension = validation.safeExtension || "jpg";
        const filePath = `${user.id}/${Date.now()}.${safeExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(filePath, photo, {
            contentType: photo.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
          throw new Error("Photo upload failed.");
        }

        const { data: publicUrlData } = supabase.storage
          .from("report-photos")
          .getPublicUrl(filePath);

        photoUrl = publicUrlData.publicUrl;
      }

      // --------------------------------
      // STEP 3: PROCESS REPORT THROUGH AI CLUSTERING & STORE
      // --------------------------------
      const clusterResult = await civicStore.processNewCitizenReport({
        title: cleanTitle,
        description: cleanDescription,
        category: aiData?.category,
        location: cleanLocation,
        photoUrl,
        user,
        latitude: coords?.latitude || 22.5726,
        longitude: coords?.longitude || 88.3639
      });

      const effectiveAi = aiData || {
        issue: clusterResult.aiAnalysis.normalizedProblem,
        category: clusterResult.aiAnalysis.category,
        severity: clusterResult.aiAnalysis.severity,
        priority: clusterResult.incident.priority,
        summary: `AI Assessment: Categorized under ${clusterResult.aiAnalysis.category}. Severity rated ${clusterResult.aiAnalysis.severity}. Dynamic priority computed at ${clusterResult.incident.priority_score}.`,
        model: clusterResult.aiAnalysis.model,
        source: clusterResult.aiAnalysis.source
      };

      setAnalysis(effectiveAi);
      setClusterInfo(clusterResult);

      // Refresh reports
      await fetchReports(user.id);

      // Clear form
      setTitle("");
      setDescription("");
      setLocation("");
      setCoords(null);
      setPhoto(null);

      // Reset file input
      const fileInput = document.getElementById("report-photo");
      if (fileInput) {
        fileInput.value = "";
      }

      if (clusterResult.isClustered) {
        setMessage(
          `Report Submitted & Clustered! ✅ AI linked your report to unified incident "${clusterResult.incident.title}". Dynamic Priority: ${clusterResult.incident.priority_score}.`
        );
      } else {
        setMessage(
          `Report Submitted! ✅ New Unified Incident created: "${clusterResult.incident.title}". Grounded Public Demand active for Digital Micro-Protest!`
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Logout
  async function handleLogout() {
    await authStore.logout();
    setUser(null);
    navigate("/login", { replace: true });
  }

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    const fileInput = document.getElementById("report-photo");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  const filteredReports = reports.filter((report) => {
    if (filter === "pending") return report.status === "pending";
    if (filter === "resolved") return report.status === "resolved";
    return true;
  });

  const isSuccessMessage = message.includes("successfully") || message.includes("✅");

  const getSeverityClass = (sev) => {
    const s = (sev || "").toLowerCase();
    if (s.includes("high") || s.includes("crit")) return "danger";
    if (s.includes("med")) return "warning";
    return "cyan";
  };

  return (
    <div className="dashboard-page">
      {/* Background Ambience */}
      <div className="dash-ambient-glow dash-glow-1" />
      <div className="dash-ambient-glow dash-glow-2" />

      {/* TOP NAVBAR */}
      <nav className="dashboard-nav">
        <div className="dashboard-brand">
          <div className="brand-icon-box">
            <Shield size={22} />
          </div>
          <div className="brand-title">
            <h2>Civic<span>Shield</span></h2>
            <span className="portal-tag">Citizen Command Portal</span>
          </div>
        </div>

        <div className="dashboard-user-actions">
          <div className="network-beacon">
            <span className="dot" />
            <span>Network Live</span>
          </div>

          <Link to="/incidents" className="nav-link-btn">
            <Layers size={14} />
            <span>Public Incidents</span>
          </Link>

          <Link to="/government" className="nav-link-btn authority-btn">
            <Building2 size={14} />
            <span>Gov Portal 🏛️</span>
          </Link>

          {isVerified ? (
            <div className="verified-citizen-pill" title="Cryptographically Verified Citizen">
              <ShieldCheck size={14} />
              <span>Verified Citizen</span>
            </div>
          ) : (
            <button
              className="unverified-trigger-btn"
              onClick={() => setShowVerifyModal(true)}
              title="Verify Aadhaar/Gov ID to unlock Digital Micro-Protest support"
            >
              <Shield size={14} />
              <span>Verify Aadhaar ID</span>
            </button>
          )}

          {/* Animated Theme Switch */}
          <ThemeToggle size="sm" />

          <div className="user-profile-pill">
            <div className="user-avatar">
              {(user?.user_metadata?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: 1.2 }}>
              <span className="user-name" style={{ fontSize: "12px", fontWeight: 600 }}>
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", opacity: 0.8 }}>
                {user?.email}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} className="logout-action-btn" title="Sign out of CivicShield">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="dashboard-container">

        {/* ACTIVE GOVERNMENT EMERGENCY BROADCAST BANNER */}
        {activeBroadcasts.length > 0 && (
          <div className={`emergency-broadcast-banner ${activeBroadcasts[0].severity === "EMERGENCY" ? "emergency" : "warning"}`}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div className="broadcast-icon-box">
                <Megaphone size={22} />
              </div>
              <div>
                <span className="broadcast-tag">
                  🏛️ OFFICIAL GOVERNMENT CIVIC ADVISORY • {activeBroadcasts[0].department}
                </span>
                <h4 className="broadcast-title">
                  {activeBroadcasts[0].title}
                </h4>
                <p className="broadcast-message">
                  {activeBroadcasts[0].message}
                </p>
              </div>
            </div>
            <span className="broadcast-badge">
              Active Notice
            </span>
          </div>
        )}

        {/* WELCOME BANNER */}
        <section className="dashboard-welcome">
          <div className="welcome-text">
            <h1>Welcome back, {user?.user_metadata?.full_name ? user.user_metadata.full_name.split(" ")[0] : (user?.email ? user.email.split("@")[0] : "Citizen")} 👋</h1>
            <p>
              Account: <strong style={{ color: "var(--accent-cyan)" }}>{user?.email}</strong> • Report neighborhood concerns to route directly to municipal authorities.
            </p>
          </div>

          <div className="welcome-badge">
            <Sparkles size={14} />
            <span>Civic Neural Core Active</span>
          </div>
        </section>

        {/* STATS OVERVIEW RIBBON */}
        <section className="dashboard-stats">
          <motion.div
            className="stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="stat-card-icon cyan">
              <FileText size={22} />
            </div>
            <div className="stat-card-data">
              <h3>{reports.length}</h3>
              <p>My Total Reports</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="stat-card-icon amber">
              <Clock size={22} />
            </div>
            <div className="stat-card-data">
              <h3>{pendingCount}</h3>
              <p>Pending Review</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -2 }}
          >
            <div className="stat-card-icon emerald">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-card-data">
              <h3>{resolvedCount}</h3>
              <p>Resolved Issues</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -2 }}
          >
            <Link to="/incidents" style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
              <div className="stat-card-icon violet">
                <Users size={22} />
              </div>
              <div className="stat-card-data">
                <h3 style={{ fontSize: "17px" }}>Micro-Protests</h3>
                <p>Support Public Demands ➔</p>
              </div>
            </Link>
          </motion.div>
        </section>

        {/* REPORT SUBMISSION FORM */}
        <section className="report-section">
          <div className="section-heading">
            <h2>Submit a Civic Report</h2>
            <p>Describe the municipal or infrastructure issue clearly. Our AI engine will categorize, score severity, and prioritize it automatically.</p>
          </div>

          <form onSubmit={handleSubmit} className="report-form">
            <div className="form-grid-2">
              {/* TITLE */}
              <div className="form-group">
                <label htmlFor="report-title">
                  <Tag size={15} />
                  <span>Report Title (Optional)</span>
                </label>
                <div className="field-with-icon">
                  <input
                    id="report-title"
                    type="text"
                    placeholder="e.g. Broken water pipeline on 4th cross"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Tag size={16} className="field-icon" />
                </div>
              </div>

              {/* LOCATION WITH GPS DETECT */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label htmlFor="report-location" style={{ marginBottom: 0 }}>
                    <MapPin size={15} />
                    <span>Location or Landmark</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    style={{
                      background: "rgba(6, 182, 212, 0.12)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: "6px",
                      color: "var(--accent-cyan-light)",
                      fontSize: "11px",
                      padding: "3px 8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Navigation size={11} />
                    <span>Auto-Detect GPS</span>
                  </button>
                </div>
                <div className="field-with-icon">
                  <input
                    id="report-location"
                    type="text"
                    placeholder="e.g. Park Street, Near City Library"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <MapPin size={16} className="field-icon" />
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="form-group">
              <label htmlFor="report-description">
                <FileText size={15} />
                <span>Describe the Problem *</span>
              </label>
              <textarea
                id="report-description"
                rows={5}
                placeholder="Detail the issue, its immediate danger or inconvenience, and any landmarks to help municipal teams identify it quickly..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* PHOTO UPLOAD DROPZONE */}
            <div className="form-group">
              <label htmlFor="report-photo">
                <UploadCloud size={15} />
                <span>Upload Evidence Photo (Optional)</span>
              </label>

              <div className="photo-upload-zone" onClick={() => document.getElementById("report-photo")?.click()}>
                <input
                  id="report-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                  className="hidden-file-input"
                />

                <div className="upload-zone-content">
                  <div className="upload-icon-circle">
                    <UploadCloud size={20} />
                  </div>
                  <div className="upload-title">Click to upload or drag photo here</div>
                  <div className="upload-subtitle">PNG, JPG, or WEBP up to 5MB</div>
                </div>
              </div>

              {photo && (
                <div className="photo-preview-box">
                  <div className="preview-file-info">
                    <FileText size={16} />
                    <span>{photo.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      ({(photo.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="remove-photo-btn"
                    title="Remove selected photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="submit-report-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Analyzing & Submitting Report...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Analyze & Submit Civic Report</span>
                  <Send size={16} />
                </>
              )}
            </button>
          </form>

          {/* STATUS MESSAGE BANNER */}
          {message && (
            <div className={`dashboard-message ${isSuccessMessage ? "success" : "error"}`}>
              {isSuccessMessage ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          )}
        </section>

        {/* AI ANALYSIS ASSESSMENT CARD */}
        <AnimatePresence>
          {analysis && (
            <motion.section
              className="ai-analysis-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="ai-card-glow" />

              <div className="ai-analysis-header">
                <div className="ai-header-left">
                  <span className="ai-eyebrow">
                    <Bot size={14} />
                    CIVICSHIELD AI ASSESSMENT COMPLETE
                  </span>
                  <h2>Complaint Telemetry Validated ⚡</h2>
                </div>

                <div className="ai-verified-badge">
                  <Sparkles size={13} />
                  <span>{analysis.model ? `⚡ ${analysis.model}` : "Neural Synthesis Verified"}</span>
                </div>
              </div>

              <div className="ai-metrics-grid">
                <div className="analysis-item cyan">
                  <span>Detected Issue</span>
                  <strong>{analysis.issue || "Municipal Concern"}</strong>
                </div>

                <div className="analysis-item">
                  <span>Category</span>
                  <strong>{analysis.category || "General Infrastructure"}</strong>
                </div>

                <div className={`analysis-item ${getSeverityClass(analysis.severity)}`}>
                  <span>Severity Rating</span>
                  <strong>{analysis.severity || "Standard"}</strong>
                </div>

                <div className="analysis-item warning">
                  <span>Authority Priority</span>
                  <strong>{analysis.priority || "Pending Review"}</strong>
                </div>
              </div>

              <div className="ai-summary-box">
                <div className="ai-summary-title">
                  <Activity size={16} />
                  <span>AI Incident Brief & Dispatch Summary</span>
                </div>
                <p>{analysis.summary || "Complaint successfully categorized for municipal dispatch."}</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* AI INCIDENT CLUSTERING & MICRO-PROTEST LINK */}
        <AnimatePresence>
          {clusterInfo && (
            <motion.section
              className="ai-analysis-card"
              style={{
                borderColor: "rgba(139, 92, 246, 0.45)",
                background: "linear-gradient(135deg, rgba(16, 26, 46, 0.95) 0%, rgba(20, 15, 38, 0.95) 100%)",
                boxShadow: "0 10px 30px rgba(139, 92, 246, 0.15)"
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              <div className="ai-analysis-header">
                <div className="ai-header-left">
                  <span className="ai-eyebrow" style={{ color: "var(--accent-violet)" }}>
                    <Layers size={14} />
                    {clusterInfo.isClustered
                      ? "SEMANTIC INCIDENT CLUSTERING COMPLETE"
                      : "NEW UNIFIED INCIDENT INITIALIZED"}
                  </span>
                  <h2>{clusterInfo.incident.title}</h2>
                </div>

                <Link
                  to="/incidents"
                  className="nav-link-btn"
                  style={{
                    borderColor: "var(--accent-cyan)",
                    color: "var(--accent-cyan-light)",
                    background: "rgba(6, 182, 212, 0.1)"
                  }}
                >
                  <span>Explore Incident & Micro-Protest ➔</span>
                </Link>
              </div>

              <div className="ai-metrics-grid">
                <div className="analysis-item">
                  <span>Clustered Reports</span>
                  <strong>{clusterInfo.incident.count || 1} Submissions</strong>
                </div>

                <div className="analysis-item warning">
                  <span>Dynamic Priority</span>
                  <strong>
                    {clusterInfo.incident.priority_score} ({clusterInfo.incident.priority?.split(" - ")[0]})
                  </strong>
                </div>

                <div className="analysis-item cyan">
                  <span>Cluster Correlation</span>
                  <strong>
                    {clusterInfo.isClustered
                      ? `${(clusterInfo.similarityScore * 100).toFixed(0)}% Match`
                      : "Origin Root"}
                  </strong>
                </div>

                <div className="analysis-item emerald">
                  <span>Micro-Protest Demand</span>
                  <strong>Active for Voting</strong>
                </div>
              </div>

              <div className="ai-summary-box" style={{ borderColor: "rgba(139, 92, 246, 0.25)" }}>
                <div className="ai-summary-title" style={{ color: "var(--accent-violet)" }}>
                  <Users size={16} />
                  <span>Public Demand Activated</span>
                </div>
                <p>
                  This issue has been aggregated into the civic intelligence feed. Verified citizens can now one-tap
                  support the collective demand without physical gathering.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* MY REPORTS SECTION */}
        <section className="my-reports-section">
          <div className="reports-header-row">
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <h2>My Submitted Reports</h2>
              <p>
                Track the verification status and resolution lifecycle of your community submissions.
              </p>
            </div>

            <div className="reports-filter-tabs">
              <button
                className={`filter-tab ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({reports.length})
              </button>
              <button
                className={`filter-tab ${filter === "pending" ? "active" : ""}`}
                onClick={() => setFilter("pending")}
              >
                Pending ({pendingCount})
              </button>
              <button
                className={`filter-tab ${filter === "resolved" ? "active" : ""}`}
                onClick={() => setFilter("resolved")}
              >
                Resolved ({resolvedCount})
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="empty-reports">
              <Loader2 size={24} className="spinner-icon" style={{ color: "var(--accent-cyan-light)" }} />
              <p>Retrieving citizen telemetry...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-reports">
              <div className="empty-reports-icon">
                <Inbox size={26} />
              </div>
              <p>
                {filter === "all"
                  ? "You haven't submitted any civic reports yet."
                  : `No ${filter} reports found.`}
              </p>
              <span>Submit a report above to help protect and upgrade your community.</span>
            </div>
          ) : (
            <div className="reports-list">
              {filteredReports.map((report) => (
                <motion.div
                  className="report-card"
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="report-card-content">
                    <div className="report-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3>{report.title || "Civic Issue Report"}</h3>
                        {report.government_verified && (
                          <span style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            color: "#fbbf24",
                            fontSize: "11px",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }} title={`Officially verified by ${report.verified_by || "Municipal Official"}`}>
                            <ShieldCheck size={12} />
                            <span>Gov Verified 🏛️</span>
                          </span>
                        )}
                      </div>

                      <span className={`status-badge ${report.status === "pending" ? "pending" : report.status === "resolved" ? "resolved" : "other"}`}>
                        {report.status === "pending" ? (
                          <>
                            <Clock size={12} />
                            <span>Pending Review</span>
                          </>
                        ) : report.status === "resolved" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Resolved</span>
                          </>
                        ) : (
                          <span>{report.status}</span>
                        )}
                      </span>
                    </div>

                    {report.category && (
                      <span className="report-category">
                        {report.category}
                      </span>
                    )}

                    <p className="report-description">{report.description}</p>

                    {/* OFFICIAL WORK COMMENCEMENT ANNOUNCEMENT BOX */}
                    {report.official_announcement && (
                      <div style={{
                        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.05) 100%)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        margin: "10px 0"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                          <Megaphone size={13} />
                          <span>Official Municipal Response to Citizens</span>
                        </div>
                        <p style={{ margin: "4px 0 0", color: "#f8fafc", fontSize: "12px", lineHeight: 1.4 }}>
                          {report.official_announcement}
                        </p>
                        {(report.crew_assigned || report.eta) && (
                          <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
                            {report.crew_assigned && <span>Crew: <strong style={{ color: "#e2e8f0" }}>{report.crew_assigned}</strong></span>}
                            {report.eta && <span>Target ETA: <strong style={{ color: "#fbbf24" }}>{report.eta}</strong></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {report.location && (
                      <div className="report-location">
                        <MapPin size={14} />
                        <span>{report.location}</span>
                      </div>
                    )}

                    <div className="report-meta">
                      {report.severity && (
                        <span>
                          <AlertTriangle size={13} />
                          Severity: <strong>{report.severity}</strong>
                        </span>
                      )}

                      <span>
                        <Calendar size={13} />
                        {new Date(report.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {report.photo_url && (
                    <div className="report-image-wrapper">
                      <img
                        src={report.photo_url}
                        alt="Reported civic issue"
                        className="report-image"
                        loading="lazy"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Aadhaar Identity Verification Prompt Modal (Post-Registration Onboarding) */}
      <AnimatePresence>
        {showOnboardingPrompt && (
          <div className="onboarding-prompt-overlay">
            <motion.div
              className="onboarding-prompt-card"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="onboarding-icon-badge">
                <ShieldCheck size={36} />
              </div>

              <h2>Welcome to CivicShield!</h2>
              <p className="onboarding-tagline">
                Would you like to verify your citizen identity with Aadhaar now?
              </p>

              <div className="onboarding-perks">
                <div className="onboarding-perk-item">
                  <CheckCircle2 size={16} className="perk-icon" />
                  <div>
                    <strong>Digital Micro-Protest Voting</strong>
                    <span>Cast cryptographically verified votes on public community demands.</span>
                  </div>
                </div>
                <div className="onboarding-perk-item">
                  <CheckCircle2 size={16} className="perk-icon" />
                  <div>
                    <strong>Fast-Track Priority Routing</strong>
                    <span>Incidents backed by verified citizens receive higher municipal dispatch priority.</span>
                  </div>
                </div>
                <div className="onboarding-perk-item">
                  <CheckCircle2 size={16} className="perk-icon" />
                  <div>
                    <strong>Privacy Guaranteed</strong>
                    <span>Zero-knowledge validation. Your 12-digit number is never stored in plain text.</span>
                  </div>
                </div>
              </div>

              <p className="onboarding-note">
                Verification is completely optional. You can verify now, or skip and explore the entire portal with full access immediately.
              </p>

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-verify-btn"
                  onClick={() => {
                    setShowOnboardingPrompt(false);
                    setShowVerifyModal(true);
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Verify Aadhaar ID Now</span>
                </button>

                <button
                  type="button"
                  className="onboarding-skip-btn"
                  onClick={() => setShowOnboardingPrompt(false)}
                >
                  <span>Skip for Now & Access Portal</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Citizen Identity Verification Modal */}
      <VerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        user={user}
        onVerified={(record) => {
          setIsVerified(true);
          setVerificationRecord(record);
        }}
      />
    </div>
  );
}

export default Dashboard;