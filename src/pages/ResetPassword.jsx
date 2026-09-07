import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "../auth.css";

function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setMessage("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated successfully! 🎉");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }

    setLoading(false);
  };

  const isSuccessMessage = message.includes("successfully");

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
              <KeyRound size={28} />
            </div>
            <h1>Reset Password</h1>
            <p>Define a new secure password for your account</p>
          </div>

          <form onSubmit={handleReset} className="auth-form">
            <div className="input-field-group">
              <label htmlFor="reset-new-password">New Password (min. 6 characters)</label>
              <div className="input-icon-wrapper">
                <input
                  id="reset-new-password"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Lock size={17} className="input-icon" />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="input-icon-wrapper">
                <input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Lock size={17} className="input-icon" />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Updating Security Credentials...</span>
                </>
              ) : (
                <>
                  <span>Update Password</span>
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
              Remember your password? <Link to="/login">Back to Login</Link>
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

export default ResetPassword;