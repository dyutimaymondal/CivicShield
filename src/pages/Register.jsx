import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, User, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import "../auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Registration successful! Check your email if confirmation is required."
      );

      if (data.session) {
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    }

    setLoading(false);
  };

  const isSuccessMessage = message.includes("successful") || message.includes("Check your email");

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
              <label htmlFor="register-password">Password (min. 6 characters)</label>
              <div className="input-icon-wrapper">
                <input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <Lock size={17} className="input-icon" />
              </div>
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