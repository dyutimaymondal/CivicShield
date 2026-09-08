import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, CheckCircle2, AlertCircle, X, Loader2, KeyRound, Smartphone, Lock } from "lucide-react";
import { verificationService } from "../lib/verificationService";

export default function VerifyModal({ isOpen, onClose, user, onVerified }) {
  const [step, setStep] = useState("aadhaar"); // "aadhaar" | "otp" | "success"
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAadhaarFormat = (val) => {
    // Remove non-digits and group in 4s
    const cleaned = val.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    setAadhaarNumber(parts.join(" "));
    setError("");
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    const rawDigits = aadhaarNumber.replace(/\s+/g, "");
    if (rawDigits.length !== 12) {
      setError("Please enter a complete 12-digit Aadhaar number.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      setError("");
    }, 600);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit verification code sent to your registered mobile.");
      return;
    }

    setLoading(true);
    setError("");

    const userId = user?.id || "citizen_user_local";
    const citizenName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Citizen";

    const res = await verificationService.verifyAadhaar(userId, aadhaarNumber, cleanOtp, citizenName);

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Identity verification failed.");
      return;
    }

    setStep("success");
    if (onVerified) onVerified(res.record);
    setTimeout(() => {
      onClose();
      setStep("aadhaar");
      setAadhaarNumber("");
      setOtp("");
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          className="verify-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow */}
          <div className="verify-glow" />

          {/* Modal Header */}
          <div className="verify-modal-header">
            <div className="verify-header-badge">
              <ShieldCheck size={20} className="badge-shield-icon" />
              <span>CIVIC IDENTITY ENCLAVE</span>
            </div>
            <button className="verify-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {step === "aadhaar" && (
            <form onSubmit={handleSendOtp} className="verify-form">
              <div className="verify-intro">
                <h2>Verified Citizen Authentication</h2>
                <p>
                  To prevent coordinated bot manipulation and ensure legitimate democratic participation in 
                  <strong> Digital Micro-Protests</strong>, CivicShield verifies citizen identity.
                </p>
                <div className="privacy-pill">
                  <Lock size={12} />
                  <span>UIDAI Zero-Knowledge Encrypted Sandbox</span>
                </div>
              </div>

              <div className="verify-field-group">
                <label htmlFor="aadhaar-input">
                  <KeyRound size={15} />
                  <span>12-Digit Aadhaar / Digital ID Number</span>
                </label>
                <input
                  id="aadhaar-input"
                  type="text"
                  placeholder="5421  8904  1234"
                  value={aadhaarNumber}
                  onChange={(e) => handleAadhaarFormat(e.target.value)}
                  autoFocus
                />
                <span className="field-helper">
                  Demo mode: Enter any 12 digits (e.g. 5421 8904 1234). Personal records are never stored in plain text.
                </span>
              </div>

              {error && (
                <div className="verify-error-box">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="verify-primary-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Initiating Secure Verification...</span>
                  </>
                ) : (
                  <>
                    <Smartphone size={16} />
                    <span>Generate Secure OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="verify-form">
              <div className="verify-intro">
                <h2>Enter 6-Digit Auth Code</h2>
                <p>
                  A simulated one-time authentication passcode has been dispatched for 
                  <strong style={{ color: "var(--accent-cyan-light)" }}> {aadhaarNumber}</strong>.
                </p>
              </div>

              <div className="verify-field-group">
                <label htmlFor="otp-input">
                  <KeyRound size={15} />
                  <span>6-Digit Verification Code</span>
                </label>
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="demo-autofill-btn"
                  onClick={() => setOtp("123456")}
                >
                  Click to Auto-fill Demo OTP (123456)
                </button>
              </div>

              {error && (
                <div className="verify-error-box">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="verify-action-row">
                <button
                  type="button"
                  className="verify-back-btn"
                  onClick={() => {
                    setStep("aadhaar");
                    setError("");
                  }}
                >
                  Change Number
                </button>
                <button type="submit" className="verify-primary-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Validating Cryptographic Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Confirm & Issue Badge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <motion.div
              className="verify-success-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="success-icon-wrap">
                <CheckCircle2 size={48} className="success-check-icon" />
              </div>
              <h2>Citizen Identity Verified! 🛡️</h2>
              <p>Your cryptographic credential has been issued. You are now authorized to support Digital Micro-Protest demands across CivicShield.</p>
              <div className="success-badge-pill">
                <Shield size={14} />
                <span>Verified Citizen • {aadhaarNumber.slice(-4) ? `•••• ${aadhaarNumber.slice(-4)}` : "UIDAI Verified"}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
