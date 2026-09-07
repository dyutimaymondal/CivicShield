import { useEffect, useState } from "react";
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

  return (
    <div className="dashboard-page">
      {/* NAVBAR */}

      <nav className="dashboard-nav">
        <div>
          <h2>CivicShield</h2>
          <p>Citizen Dashboard</p>
        </div>

        <div className="dashboard-user">
          <span>
            {user?.user_metadata?.full_name ||
              user?.email ||
              "Citizen"}
          </span>

          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* MAIN */}

      <main className="dashboard-container">

        {/* WELCOME */}

        <section className="dashboard-welcome">
          <h1>Welcome to CivicShield 👋</h1>

          <p>
            Report civic problems and let CivicShield analyze
            and prioritize them automatically.
          </p>
        </section>

        {/* REPORT FORM */}

        <section className="report-section">

          <div className="section-heading">
            <h2>Submit a Civic Report</h2>
            <p>
              Describe the problem clearly. CivicShield will
              analyze it automatically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="report-form">

            {/* TITLE */}

            <div className="form-group">
              <label>Report Title</label>

              <input
                type="text"
                placeholder="Example: Large pothole on main road"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* DESCRIPTION */}

            <div className="form-group">
              <label>Describe the Problem *</label>

              <textarea
                rows="6"
                placeholder="Example: A large pothole has formed on the main road and is causing difficulty for vehicles and pedestrians."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* LOCATION */}

            <div className="form-group">
              <label>Location</label>

              <input
                type="text"
                placeholder="Example: Main Road, Kolkata"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* PHOTO */}

            <div className="form-group">
              <label>Upload Photo</label>

              <input
                id="report-photo"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPhoto(e.target.files?.[0] || null)
                }
              />
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              className="submit-report-btn"
              disabled={loading}
            >
              {loading
                ? "Analyzing & Submitting..."
                : "Analyze & Submit Report"}
            </button>

          </form>

          {/* MESSAGE */}

          {message && (
            <div className="dashboard-message">
              {message}
            </div>
          )}
        </section>

        {/* AI ANALYSIS */}

        {analysis && (
          <section
            className="ai-analysis-card"
            style={{
              marginTop: "30px",
              padding: "25px",
              borderRadius: "18px",
              background: "#0f172a",
              border: "1px solid #14b8a6",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  color: "#14b8a6",
                  fontWeight: "700",
                  marginBottom: "5px",
                }}
              >
                CIVICSHIELD AI ANALYSIS
              </p>

              <h2 style={{ margin: 0 }}>
                Complaint Analysis Complete 🤖
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >

              {/* ISSUE */}

              <div className="analysis-item">
                <span>Issue</span>
                <strong>{analysis.issue}</strong>
              </div>

              {/* CATEGORY */}

              <div className="analysis-item">
                <span>Category</span>
                <strong>{analysis.category}</strong>
              </div>

              {/* SEVERITY */}

              <div className="analysis-item">
                <span>Severity</span>
                <strong>{analysis.severity}</strong>
              </div>

              {/* PRIORITY */}

              <div className="analysis-item">
                <span>Priority</span>
                <strong>{analysis.priority}</strong>
              </div>
            </div>

            {/* SUMMARY */}

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <span
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                AI Summary
              </span>

              <p style={{ margin: 0, lineHeight: "1.6" }}>
                {analysis.summary}
              </p>
            </div>
          </section>
        )}

        {/* MY REPORTS */}

        <section className="my-reports-section">

          <div className="section-heading">
            <h2>My Reports</h2>

            <p>
              {reports.length} submitted report
              {reports.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loadingReports ? (
            <p>Loading reports...</p>
          ) : reports.length === 0 ? (
            <div className="empty-reports">
              <p>You haven't submitted any reports yet.</p>
            </div>
          ) : (
            <div className="reports-list">

              {reports.map((report) => (
                <div
                  className="report-card"
                  key={report.id}
                >

                  <div className="report-card-content">

                    <div className="report-card-header">
                      <h3>
                        {report.title ||
                          "Civic Issue Report"}
                      </h3>

                      <span className="status-badge">
                        {report.status}
                      </span>
                    </div>

                    <p className="report-category">
                      {report.category}
                    </p>

                    <p className="report-description">
                      {report.description}
                    </p>

                    {report.location && (
                      <p className="report-location">
                        📍 {report.location}
                      </p>
                    )}

                    <div className="report-meta">
                      <span>
                        Severity: {report.severity}
                      </span>

                      <span>
                        {new Date(
                          report.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                  </div>

                  {/* PHOTO */}

                  {report.photo_url && (
                    <img
                      src={report.photo_url}
                      alt="Reported civic issue"
                      className="report-image"
                    />
                  )}

                </div>
              ))}
            </div>
          )}
        </section>

        {/* STATS */}

        <section className="dashboard-stats">

          <div className="stat-card">
            <h3>{reports.length}</h3>
            <p>My Reports</p>
          </div>

          <div className="stat-card">
            <h3>
              {
                reports.filter(
                  (report) =>
                    report.status === "pending"
                ).length
              }
            </h3>

            <p>Pending</p>
          </div>

          <div className="stat-card">
            <h3>
              {
                reports.filter(
                  (report) =>
                    report.status === "resolved"
                ).length
              }
            </h3>

            <p>Resolved</p>
          </div>

        </section>

      </main>
    </div>
  );
}

export default Dashboard;