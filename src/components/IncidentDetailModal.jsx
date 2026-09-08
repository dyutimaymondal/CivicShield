import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Users,
  Building2,
  Info,
  Loader2
} from "lucide-react";
import { civicStore } from "../lib/civicStore";
import { verificationService } from "../lib/verificationService";

export default function IncidentDetailModal({
  isOpen,
  onClose,
  incident,
  user,
  onOpenVerifyModal
}) {
  const [customProtestState, setCustomProtestState] = useState(null);
  const [supportMessage, setSupportMessage] = useState("");
  const [isSupporting, setIsSupporting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const baseProtest = incident ? civicStore.getMicroProtestForIncident(incident.id) : null;
  const microProtest = customProtestState || baseProtest;
  const hasSupported = microProtest && user?.id ? civicStore.hasCitizenSupported(microProtest.id, user.id) : false;

  if (!isOpen || !incident) return null;

  const handleSupportDemand = () => {
    if (!user) {
      setSupportMessage("Please sign in to support this public demand.");
      return;
    }

    const verification = verificationService.getVerificationStatus(user.id);
    if (!verification.isVerified) {
      if (onOpenVerifyModal) {
        onOpenVerifyModal();
      } else {
        setSupportMessage("Verification Required: Verify your Aadhaar/Gov ID first to vote.");
      }
      return;
    }

    if (!microProtest) return;

    setIsSupporting(true);
    setSupportMessage("");

    setTimeout(() => {
      const res = civicStore.supportMicroProtest(microProtest.id, user.id, verification);
      setIsSupporting(false);

      if (res.success) {
        setCustomProtestState({
          ...microProtest,
          support_count: res.newSupportCount,
          velocity_6h: res.velocity6h
        });
        setSupportMessage("✓ Your verified support has been transactionally recorded!");
      } else {
        setSupportMessage(res.error || "Unable to register support.");
      }
    }, 400);
  };

  const priorityScore = incident.priority_score || 0.75;
  const breakdown = incident.priority_breakdown || {
    severity_score: 0.8,
    impact_score: 0.7,
    volume_score: 0.6,
    velocity_score: 0.8,
    confidence_score: 0.9,
    evidence_score: 0.7
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          className="incident-detail-modal"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header-strip">
            <div className="header-badges">
              <span className={`status-pill ${incident.status?.toLowerCase()}`}>
                {incident.status}
              </span>
              <span className="category-pill">{incident.category}</span>
              <span className="priority-pill">
                Priority: {(priorityScore * 100).toFixed(0)}%
              </span>
            </div>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="modal-scroll-body">
            {/* Title & Location */}
            <div className="incident-title-block">
              <h2>{incident.title}</h2>
              <div className="incident-geo-meta">
                <MapPin size={15} />
                <span>{incident.location || "Recorded Municipal Zone"}</span>
                <span className="meta-sep">•</span>
                <Clock size={14} />
                <span>Reported {new Date(incident.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Description */}
            <p className="incident-full-desc">{incident.description}</p>

            {/* AI Summary Banner */}
            {incident.ai_summary && (
              <div className="ai-brief-banner">
                <div className="brief-badge">
                  <Sparkles size={14} />
                  <span>AI CIVIC TRIAGE BRIEF</span>
                  {incident.ai_model && (
                    <span style={{ marginLeft: "auto", fontSize: "11px", opacity: 0.85, color: "var(--accent-cyan)", fontWeight: 600 }}>
                      ⚡ {incident.ai_model}
                    </span>
                  )}
                </div>
                <p>{incident.ai_summary}</p>
              </div>
            )}

            {/* Priority Breakdown Toggle */}
            <div className="priority-score-card">
              <div className="score-card-header">
                <div className="score-header-left">
                  <span className="score-label">Explainable Dynamic Priority</span>
                  <div className="score-val-wrap">
                    <strong className="score-val">{priorityScore.toFixed(3)}</strong>
                    <span className="score-badge-text">{incident.priority}</span>
                  </div>
                </div>
                <button
                  className="toggle-breakdown-btn"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                >
                  {showBreakdown ? "Hide Factor Breakdown" : "Inspect Algorithm Breakdown"}
                </button>
              </div>

              {showBreakdown && (
                <motion.div
                  className="breakdown-grid"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <div className="breakdown-item">
                    <span>Severity (25%)</span>
                    <strong>{((breakdown.severity_score || 0.7) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val red" style={{ width: `${(breakdown.severity_score || 0.7) * 100}%` }} />
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <span>Impact Scope (20%)</span>
                    <strong>{((breakdown.impact_score || 0.6) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val amber" style={{ width: `${(breakdown.impact_score || 0.6) * 100}%` }} />
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <span>Report Volume (20%)</span>
                    <strong>{((breakdown.volume_score || 0.8) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val cyan" style={{ width: `${(breakdown.volume_score || 0.8) * 100}%` }} />
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <span>Reporting Velocity (15%)</span>
                    <strong>{((breakdown.velocity_score || 0.8) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val violet" style={{ width: `${(breakdown.velocity_score || 0.8) * 100}%` }} />
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <span>AI Confidence (10%)</span>
                    <strong>{((breakdown.confidence_score || 0.9) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val emerald" style={{ width: `${(breakdown.confidence_score || 0.9) * 100}%` }} />
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <span>Evidence Quality (10%)</span>
                    <strong>{((breakdown.evidence_score || 0.7) * 100).toFixed(0)}%</strong>
                    <div className="bar-track">
                      <div className="bar-val blue" style={{ width: `${(breakdown.evidence_score || 0.7) * 100}%` }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Clustered Evidence Summary */}
            <div className="cluster-evidence-strip">
              <div className="cluster-stat">
                <Layers size={16} className="cluster-icon" />
                <span>
                  <strong>{incident.count || 1}</strong> Citizen Reports Clustered
                </span>
              </div>
              <div className="cluster-stat">
                <Building2 size={16} className="cluster-icon" />
                <span>
                  Target Authority: <strong>{incident.department || "Municipal Works"}</strong>
                </span>
              </div>
            </div>

            {/* Official Municipal Response */}
            {incident.official_response && (
              <div className="official-response-box">
                <div className="official-header">
                  <ShieldCheck size={16} />
                  <span>OFFICIAL MUNICIPAL RESPONSE</span>
                </div>
                <p>{incident.official_response}</p>
              </div>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* DIGITAL MICRO-PROTEST SECTION (P0 SPECIAL FOCUS)                   */}
            {/* ----------------------------------------------------------------- */}
            {microProtest && (
              <div className="micro-protest-enclave">
                <div className="protest-ambient-glow" />

                <div className="protest-enclave-header">
                  <div className="enclave-title-badge">
                    <Users size={16} />
                    <span>DIGITAL MICRO-PROTEST CAMPAIGN</span>
                  </div>
                  <div className="protest-live-indicator">
                    <span className="ping-dot" />
                    <span>ACTIVE DEMAND</span>
                  </div>
                </div>

                {/* Grounded Public Demand */}
                <div className="protest-demand-box">
                  <span className="demand-label">Grounded Public Demand:</span>
                  <p className="demand-quote">"{microProtest.demand_text}"</p>
                  <div className="demand-provenance">
                    <Sparkles size={12} />
                    <span>
                      {microProtest.demand_provenance?.source
                        ? `Demand Provenance: ${microProtest.demand_provenance.source}`
                        : "AI-Synthesized from Clustered Evidence • Legitimate Municipal Action"}
                    </span>
                  </div>
                </div>

                {/* Support Telemetry Counters */}
                <div className="protest-telemetry-row">
                  <div className="telemetry-item">
                    <span className="tel-label">Verified Citizen Support</span>
                    <strong className="tel-val cyan">
                      {microProtest.support_count?.toLocaleString() || 0}
                    </strong>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">Support Velocity (6h)</span>
                    <strong className="tel-val emerald">
                      +{microProtest.velocity_6h || Math.floor((microProtest.support_count || 10) * 0.15)}
                      <TrendingUp size={14} style={{ display: "inline", marginLeft: "4px" }} />
                    </strong>
                  </div>
                  <div className="telemetry-item">
                    <span className="tel-label">Target Recipient</span>
                    <strong className="tel-val">
                      {microProtest.target_department || "PWD"}
                    </strong>
                  </div>
                </div>

                {/* Safety & Non-Violent Participation Notice (PRD Requirement) */}
                <div className="protest-safety-notice">
                  <Info size={14} />
                  <p>
                    <strong>Digital Micro-Protest Notice:</strong> This is an authenticated, non-violent digital civic demand mechanism. It translates individual complaints into legitimate collective municipal signals without physical gathering, traffic disruption, or public inconvenience.
                  </p>
                </div>

                {/* Support CTA Button */}
                <div className="protest-cta-box">
                  {hasSupported ? (
                    <div className="supported-badge-box">
                      <CheckCircle2 size={20} className="check-supported-icon" />
                      <div>
                        <strong>You are supporting this Demand</strong>
                        <p>Your verified civic voice has been transmitted to municipal dispatch.</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="support-demand-btn"
                      onClick={handleSupportDemand}
                      disabled={isSupporting}
                    >
                      {isSupporting ? (
                        <>
                          <Loader2 size={18} className="spinner-icon" />
                          <span>Transacting Cryptographic Support...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>One-Tap Support this Demand</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {supportMessage && (
                  <div className={`protest-message-banner ${supportMessage.includes("✓") ? "success" : "error"}`}>
                    {supportMessage.includes("✓") ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{supportMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
