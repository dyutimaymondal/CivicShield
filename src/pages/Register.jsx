import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, User, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import { authStore } from "../lib/authStore";
import { rateLimiter, sanitizeInput, validateEmail, validatePassword } from "../lib/security";
import ThemeToggle from "../components/ThemeToggle";
import "../auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    authStore.getActiveSession().then((session) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Sanitize user inputs
    const cleanName = sanitizeInput(name, 100);
    const cleanEmail = sanitizeInput(email).toLowerCase();

    if (!cleanName) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setMessage("Please enter a valid email address format.");
      return;
    }

    // 2. Validate strict password policy (anti-brute-force defense)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setMessage(passwordCheck.error || "Password does not meet complexity requirements.");
      return;
    }

    // 3. Client registration throttle (anti-bot defense: max 1 per 10s)
    const cooldown = rateLimiter.checkCooldown("client_registration", 10);
    if (!cooldown.allowed) {
      setMessage(`Registration limit reached. Please wait ${cooldown.remainingSeconds}s before submitting.`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authStore.registerWithoutEmailConfirmation(cleanEmail, password, cleanName);

      // Signal Dashboard to prompt for Aadhaar verification
      sessionStorage.setItem("civicshield_prompt_verify", "true");

      setMessage("Account created successfully! Launching citizen portal... 🚀");
      setTimeout(() => {
        navigate("/dashboard?promptVerify=true", { replace: true });
      }, 700);
    } catch (err) {
      setMessage(err.message || "Unable to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSuccessMessage = message.includes("successful") || message.includes("Launching");

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
          <div className="auth-top-bar">
            <Link to="/" className="back-home-link" style={{ margin: 0 }}>
              <ArrowLeft size={14} />
              <span>Home</span>
            </Link>
            <ThemeToggle size="sm" />
          </div>

          <div className="auth-card-glow" />

          <div className="auth-header">
            <div className="auth-logo-badge">
              <Shield size={28} />
            </div>
            <h1>Create Account</h1>
            <p>Join CivicShield to protect and improve your community</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-field-group">
              <label htmlFor="register-name">Full Name</label>
              <div className="input-icon-wrapper">
                <input
                  id="register-name"
                  type="text"
                  placeholder="Citizen Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <User size={17} className="input-icon" />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="register-email">Email Address</label>
              <div className="input-icon-wrapper">
                <input
                  id="register-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Mail size={17} className="input-icon" />
              </div>
            </div>

            <div className="input-field-group">
              <label htmlFor="register-password">Password</label>
              <div className="input-icon-wrapper">
                <input
                  id="register-password"
                  type="password"
                  placeholder="Min. 8 chars (upper, lower, number, symbol)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <Lock size={17} className="input-icon" />
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <Info size={12} />
                Requires 8+ characters, uppercase, lowercase, numbers & symbols.
              </span>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create CivicShield Account</span>
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
              Already have an account? <Link to="/login">Login</Link>
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

export default Register;