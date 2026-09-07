import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
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
  AlertTriangle
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "../dashboard.css";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [message, setMessage] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [filter, setFilter] = useState("all");

  // Get logged-in user
  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error(error);
      return;
    }

    setUser(data.user);

    if (data.user) {
      fetchReports(data.user.id);
    }
  }

  // Fetch user's reports
  async function fetchReports(userId) {
    setLoadingReports(true);

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
    } else {
      setReports(data || []);
    }

    setLoadingReports(false);
  }

  // Submit report
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setAnalysis(null);

    if (!description.trim()) {
      setMessage("Please enter a complaint description.");
      return;
    }

    if (!user) {
      setMessage("Please login first.");
      return;
    }

    setLoading(true);

    try {
      // --------------------------------
      // STEP 1: AI ANALYSIS
      // --------------------------------

      const { data: aiData, error: aiError } =
        await supabase.functions.invoke("analyze-report", {
          body: {
            description: description,
          },
        });

      if (aiError) {
        console.error("AI analysis error:", aiError);
        throw new Error("AI analysis failed.");
      }

      if (aiData?.error) {
        throw new Error(aiData.error);
      }

      console.log("AI Analysis:", aiData);

      setAnalysis(aiData);

      // --------------------------------
      // STEP 2: UPLOAD PHOTO
      // --------------------------------

      let photoUrl = "";

      if (photo) {
        const fileExtension =
          photo.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${user.id}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(filePath, photo);

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
      // STEP 3: SAVE REPORT
      // --------------------------------

      const { error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            title: title || aiData.issue,
            description: description,
            category: aiData.category,
            location: location,
            photo_url: photoUrl,
            status: "pending",
            severity: aiData.severity,
            user_id: user.id,
          },
        ]);

      if (insertError) {
        console.error("Database error:", insertError);
        throw new Error("Could not save the report.");
      }

      // Refresh reports
      await fetchReports(user.id);

      // Clear form
      setTitle("");
      setDescription("");
      setLocation("");
      setPhoto(null);

      // Reset file input
      const fileInput = document.getElementById("report-photo");
      if (fileInput) {
        fileInput.value = "";
      }

      setMessage("Report submitted and analyzed successfully! ✅");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
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

          <div className="user-profile-pill">
            <div className="user-avatar">
              {(user?.user_metadata?.full_name || user?.email || "C").charAt(0).toUpperCase()}
            </div>
            <span className="user-name">
              {user?.user_metadata?.full_name || user?.email || "Citizen"}
            </span>
          </div>

          <button onClick={handleLogout} className="logout-action-btn" title="Sign out of CivicShield">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="dashboard-container">

        {/* WELCOME BANNER */}
        <section className="dashboard-welcome">
          <div className="welcome-text">
            <h1>Welcome back, {user?.user_metadata?.full_name ? user.user_metadata.full_name.split(" ")[0] : "Citizen"} 👋</h1>
            <p>Report neighborhood concerns and let CivicShield analyze, cluster, and route them to municipal authorities.</p>
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

              {/* LOCATION */}
              <div className="form-group">
                <label htmlFor="report-location">
                  <MapPin size={15} />
                  <span>Location or Landmark</span>
                </label>
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
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className="hidden-file-input"
                />

                <div className="upload-zone-content">
                  <div className="upload-icon-circle">
                    <UploadCloud size={20} />
                  </div>
                  <div className="upload-title">Click to upload or drag photo here</div>
                  <div className="upload-subtitle">PNG, JPG, or WEBP up to 10MB</div>
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
                  <span>Neural Synthesis Verified</span>
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
                      <h3>{report.title || "Civic Issue Report"}</h3>
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
    </div>
  );
}

export default Dashboard;