import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  Sparkles,
  AlertTriangle,
  Trash2,
  Cpu,
  Layers,
  LayoutDashboard,
  ArrowRight,
  Activity,
  FileText,
  Radio,
  Zap,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users
} from "lucide-react";
import "./App.css";

function App() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: custom * 0.1, ease: [0.22, 1, 0.36, 1] }
    })
  };

  return (
    <div className="app">
      {/* Background Glow Elements */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="cyber-grid" />

      {/* Navigation */}
      <header className="navbar-wrapper">
        <nav className="navbar">
          <div className="logo">
            <div className="logo-icon-wrap">
              <Shield className="logo-icon" size={22} />
              <div className="logo-pulse" />
            </div>
            <span className="logo-text">Civic<span>Shield</span></span>
          </div>

          <div className="nav-links">
            <a href="#home" className="nav-link">Home</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#workflow" className="nav-link">Workflow</a>
            <a href="#about" className="nav-link">About</a>
            <Link to="/login" className="login-btn">
              <span>Access Portal</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main id="home" className="hero">
        <div className="hero-content">
          <motion.div
            className="badge"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <div className="badge-beacon">
              <span className="beacon-dot" />
              <span className="beacon-ping" />
            </div>
            <Sparkles size={14} className="badge-icon" />
            <span>AI-POWERED CIVIC INTELLIGENCE ENGINE</span>
          </motion.div>

          <motion.h1
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            Turn Civic Problems
            <br />
            Into <span className="gradient-text">Real Action.</span>
          </motion.h1>

          <motion.p
            className="hero-subtext"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            Report community issues, automatically detect and link duplicate complaints,
            and transform fragmented public concerns into validated, high-priority incidents for municipal authorities.
          </motion.p>

          <motion.div
            className="hero-buttons"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <Link to="/dashboard" className="primary-btn">
              <Zap size={18} />
              <span>Report a Problem</span>
            </Link>

            <a href="#features" className="secondary-btn">
              <span>Explore Features</span>
              <ChevronRight size={16} />
            </a>
          </motion.div>

          {/* Live System Statistics */}
          <motion.div
            className="stats"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            <div className="stat-box">
              <div className="stat-header">
                <FileText size={16} className="stat-icon cyan" />
                <span className="stat-label">Reports Logged</span>
              </div>
              <strong className="stat-number">1,240+</strong>
              <div className="stat-bar"><div className="bar-fill" style={{ width: "85%" }} /></div>
            </div>

            <div className="stat-box">
              <div className="stat-header">
                <Activity size={16} className="stat-icon emerald" />
                <span className="stat-label">Incidents Clustered</span>
              </div>
              <strong className="stat-number">186</strong>
              <div className="stat-bar"><div className="bar-fill emerald" style={{ width: "72%" }} /></div>
            </div>

            <div className="stat-box">
              <div className="stat-header">
                <ShieldCheck size={16} className="stat-icon violet" />
                <span className="stat-label">AI Verification</span>
              </div>
              <strong className="stat-number">94%</strong>
              <div className="stat-bar"><div className="bar-fill violet" style={{ width: "94%" }} /></div>
            </div>
          </motion.div>
        </div>

        {/* Live Intelligence Interactive Card */}
        <motion.div
          className="hero-card-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="hero-card">
            <div className="card-ambient-blur" />

            <div className="card-header">
              <div className="card-title-group">
                <Radio size={14} className="radar-icon" />
                <span>LIVE CIVIC TELEMETRY</span>
              </div>
              <div className="live-pill">
                <span className="live-dot" />
                <span>MONITORING</span>
              </div>
            </div>

            {/* Incident 1 */}
            <motion.div
              className="incident high-risk"
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="incident-icon-box danger">
                <AlertTriangle size={20} />
              </div>

              <div className="incident-info">
                <div className="incident-headline">
                  <h3>Major Road Damage</h3>
                  <span className="incident-time">3m ago</span>
                </div>
                <p>Multiple road fracture reports detected at Sector 4 corridor.</p>

                <div className="tags">
                  <span className="tag tag-danger">HIGH PRIORITY</span>
                  <span className="tag tag-neutral">18 REPORTS CLUSTERED</span>
                </div>
              </div>
            </motion.div>

            {/* Incident 2 */}
            <motion.div
              className="incident medium-risk"
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="incident-icon-box warning">
                <Trash2 size={20} />
              </div>

              <div className="incident-info">
                <div className="incident-headline">
                  <h3>Garbage Overflow</h3>
                  <span className="incident-time">14m ago</span>
                </div>
                <p>Public sanitation cluster identified near market transit plaza.</p>

                <div className="tags">
                  <span className="tag tag-warning">MEDIUM SEVERITY</span>
                  <span className="tag tag-neutral">11 REPORTS CLUSTERED</span>
                </div>
              </div>
            </motion.div>

            {/* AI Engine Status Terminal */}
            <div className="ai-status">
              <div className="ai-status-indicator">
                <Cpu size={16} className="ai-cpu-icon" />
                <span>CivicShield Neural Core v2.4 Active</span>
              </div>
              <span className="ai-ping">0.14s latency</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-badge">INTELLIGENCE PLATFORM</div>
        <h2>One Platform. Complete Civic Intelligence.</h2>
        <p className="section-subtitle">
          Closing the gap between decentralized citizen complaints and municipal action.
        </p>

        <div className="feature-grid">
          <motion.div
            className="feature-card"
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
          >
            <div className="feature-icon-wrapper cyan">
              <FileText size={24} />
            </div>
            <h3>Smart Complaints</h3>
            <p>
              Submit detailed citizen reports with real-time photo uploads, precise geolocation mapping, and guided context capture.
            </p>
            <div className="feature-glow cyan" />
          </motion.div>

          <motion.div
            className="feature-card"
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
          >
            <div className="feature-icon-wrapper emerald">
              <Cpu size={24} />
            </div>
            <h3>AI Categorization</h3>
            <p>
              Autonomous natural language analysis that categorizes municipal issues, calculates risk severity, and synthesizes summaries instantly.
            </p>
            <div className="feature-glow emerald" />
          </motion.div>

          <motion.div
            className="feature-card"
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
          >
            <div className="feature-icon-wrapper amber">
              <Layers size={24} />
            </div>
            <h3>Duplicate Detection</h3>
            <p>
              Intelligent vector clustering correlates similar complaints across geographical zones, preventing department backlog duplication.
            </p>
            <div className="feature-glow amber" />
          </motion.div>

          <motion.div
            className="feature-card"
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
          >
            <div className="feature-icon-wrapper violet">
              <LayoutDashboard size={24} />
            </div>
            <h3>Authority Dispatch</h3>
            <p>
              Streamlined dashboard that arms public works departments with structured incident telemetry, severity heatmaps, and verification proofs.
            </p>
            <div className="feature-glow violet" />
          </motion.div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="workflow-section">
        <div className="section-badge">CIVIC WORKFLOW</div>
        <h2>How CivicShield Solves Public Problems</h2>
        <p className="section-subtitle">A seamless pipeline from initial report to verified municipal resolution.</p>

        <div className="workflow-steps">
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-icon-wrap"><Users size={22} /></div>
            <h3>Citizen Reports</h3>
            <p>A resident observes a problem, takes a photo, and submits a report via the citizen dashboard.</p>
          </div>

          <div className="step-connector">
            <div className="connector-line" />
            <ArrowRight size={18} className="connector-arrow" />
          </div>

          <div className="step-card highlight">
            <div className="step-number">02</div>
            <div className="step-icon-wrap"><Sparkles size={22} /></div>
            <h3>AI Intelligence Analysis</h3>
            <p>CivicShield evaluates severity, checks for surrounding duplicates, and synthesizes an actionable dispatch report.</p>
          </div>

          <div className="step-connector">
            <div className="connector-line" />
            <ArrowRight size={18} className="connector-arrow" />
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-icon-wrap"><Building2 size={22} /></div>
            <h3>Authority Resolution</h3>
            <p>Municipal departments deploy repair crews, track progress, and mark the issue as verified and resolved.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-card">
          <div className="about-content">
            <span className="section-badge">ABOUT CIVICSHIELD</span>
            <h2>Empowering Communities Through Transparent Technology</h2>
            <p>
              CivicShield is designed to eliminate bureaucracy in municipal reporting.
              By leveraging modern artificial intelligence, we ensure that every citizen's voice
              is heard, validated, and converted into tangible community improvements.
            </p>
            <div className="about-metrics">
              <div className="about-metric-item">
                <strong>10x</strong>
                <span>Faster Triage</span>
              </div>
              <div className="about-metric-item">
                <strong>0%</strong>
                <span>Lost Complaints</span>
              </div>
              <div className="about-metric-item">
                <strong>100%</strong>
                <span>Public Transparency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo">
              <div className="logo-icon-wrap">
                <Shield className="logo-icon" size={20} />
              </div>
              <span className="logo-text">Civic<span>Shield</span></span>
            </div>
            <p className="footer-tagline">
              Next-generation civic intelligence infrastructure for modern, responsive societies.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#workflow">Workflow</a>
              <a href="#about">About</a>
            </div>
            <div className="footer-col">
              <h4>Portals</h4>
              <Link to="/login">Citizen Login</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/dashboard">Citizen Dashboard</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CivicShield. All civic rights reserved.</p>
          <div className="system-status">
            <span className="status-indicator-dot" />
            <span>CivicShield Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;