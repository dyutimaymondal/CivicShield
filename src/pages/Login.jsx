import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "../auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    navigate("/dashboard");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email first.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password reset link sent! Check your Gmail. 📧");
    }

    setLoading(false);
  };

  const isSuccessMessage = message.includes("sent") || message.includes("success");

  return (
    <div className="auth-page">
      <div className="auth-ambient-glow auth-glow-1" />
      <div className="auth-grid" />

      <motion.div
        className="auth-card-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="auth-card">
          <div className="auth-card-glow" />

          <div className="auth-header">
            <div className="auth-logo-badge">
              <Shield size={28} />
            </div>
            <h1>Welcome Back</h1>
            <p>Access your CivicShield citizen portal</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="input-field-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-icon-wrapper">
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Mail size={17} className="input-icon" />
              </div>
            </div>

            <div className="input-field-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="forgot-password-btn"
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-icon-wrapper">
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Lock size={17} className="input-icon" />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {message && (
            <div className={`auth-message ${isSuccessMessage ? "success" : "error"}`}>
              {isSuccessMessage ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          )}

          <div className="switch-auth">
            <p className="auth-link">
              Don't have an account? <Link to="/register">Create Account</Link>
            </p>

            <Link to="/" className="back-home-link">
              <ArrowLeft size={14} />
              <span>Back to CivicShield Home</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;