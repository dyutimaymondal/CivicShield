import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("CivicShield Platform Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#070b14",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <div style={{
            maxWidth: "500px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
          }}>
            <h2 style={{ color: "#ef4444", marginBottom: "12px", fontSize: "20px" }}>CivicShield Platform Diagnostics</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
              A client runtime diagnostic was intercepted. The platform has entered safe mode.
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Reset & Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
