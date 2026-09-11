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
      const errorMsg = this.state.error?.message || "A client runtime diagnostic was intercepted.";
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
            maxWidth: "540px",
            width: "100%",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
          }}>
            <h2 style={{ color: "#ef4444", marginBottom: "12px", fontSize: "20px", fontWeight: 700 }}>
              CivicShield Platform Diagnostics
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
              A client runtime diagnostic was intercepted. The platform has entered safe mode.
            </p>

            {this.state.error?.message && (
              <div style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "8px",
                padding: "10px 14px",
                textAlign: "left",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#fca5a5",
                marginBottom: "20px",
                maxHeight: "120px",
                overflowY: "auto",
                wordBreak: "break-word"
              }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: "10px 22px",
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(6, 182, 212, 0.35)"
                }}
              >
                Retry & Resume Platform
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  padding: "10px 18px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
