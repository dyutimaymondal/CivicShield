import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { authStore } from "../lib/authStore";
import { rateLimiter, sanitizeInput, validateEmail } from "../lib/security";
import "../auth.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Check if already authenticated
  useEffect(() => {
    authStore.getActiveSession().then((session) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setMessage("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanEmail = sanitizeInput(email).toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setMessage("Please enter a valid email address format.");
      return;
    }

    // Check brute-force lockout status
    const lockoutStatus = rateLimiter.isLockedOut(cleanEmail);
    if (lockoutStatus.locked) {
      setLockoutSeconds(lockoutStatus.remainingSeconds);
      setMessage(`Security Lockout Active: Too many failed login attempts. Please wait ${lockoutStatus.remainingSeconds}s.`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authStore.login(cleanEmail, password);

      // Success: clear brute-force counters
      rateLimiter.clearAttempts(cleanEmail);
      navigate(from, { replace: true });
    } catch (error) {
      // Record failed attempt and compute progressive backoff
      const { locked, remainingSeconds } = rateLimiter.recordFailedAttempt(cleanEmail);
      if (locked) {
        setLockoutSeconds(remainingSeconds);
        setMessage(`Security Lockout: Too many failed attempts. Try again in ${remainingSeconds}s.`);
      } else {
        setMessage(error.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = sanitizeInput(email).toLowerCase();

    if (!cleanEmail) {
      setMessage("Please enter your email address first.");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setMessage("Please enter a valid email address format.");
      return;
    }

    // Rate limit password reset requests (max 1 per 60s)
    const cooldownStatus = rateLimiter.checkCooldown(`reset_${cleanEmail}`, 60);
    if (!cooldownStatus.allowed) {
      setMessage(`Rate limit exceeded. Please wait ${cooldownStatus.remainingSeconds}s before requesting another reset link.`);
      return;
    }

    setLoading(true);
    setMessage("");

    // Use dynamic origin to avoid hardcoded localhost vulnerability
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password reset link sent! Check your email inbox. 📧");
    }

    setLoading(false);
  };

  const isSuccessMessage = message.includes("sent") || message.includes("success");
  const isLocked = lockoutSeconds > 0;

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
                  disabled={isLocked}
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
                  disabled={loading || isLocked}
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
                  disabled={isLocked}
                />
                <Lock size={17} className="input-icon" />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>Authenticating...</span>
                </>
              ) : isLocked ? (
                <>
                  <ShieldAlert size={18} />
                  <span>Locked ({lockoutSeconds}s)</span>
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