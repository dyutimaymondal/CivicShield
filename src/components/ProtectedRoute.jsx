import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { authStore } from "../lib/authStore";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const active = await authStore.getActiveSession();
        if (isMounted) {
          setSession(active);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (isMounted) {
        if (newSession) {
          authStore.setStoredSession(newSession);
          setSession(newSession);
        } else {
          const fallback = authStore.getStoredSession();
          setSession(fallback);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#070b14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#f8fafc",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          width: "36px",
          height: "36px",
          border: "3px solid rgba(6, 182, 212, 0.2)",
          borderTopColor: "#06b6d4",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <p style={{ marginTop: "16px", color: "#94a3b8", fontSize: "14px" }}>
          Authenticating citizen session...
        </p>
      </div>
    );
  }

  if (!session || !session.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
