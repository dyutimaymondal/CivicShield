import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../lib/themeContext";
import "./ThemeToggle.css";

/**
 * React Bits-inspired Celestial Day / Night Animated Switch
 * Features:
 * - Animated celestial knob: Realistic cratered Moon (Night) & Rotating radiant Sun with corona rays (Day)
 * - Dynamic sky track: Midnight starfield with twinkling stars & shooting star vs. Sunny azure sky with layered drifting clouds
 * - Specular glass sheen overlay (React Bits specular reflection)
 * - Elastic spring physics with squash & stretch
 * - High-accessibility switch semantics (role="switch", keyboard control, tooltip)
 */
export default function ThemeToggle({ size = "sm", className = "", showLabel = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Dimensions based on size
  const dims = {
    sm: { trackW: 64, trackH: 32, knobSize: 26, pad: 3 },
    md: { trackW: 76, trackH: 38, knobSize: 30, pad: 4 },
    lg: { trackW: 90, trackH: 44, knobSize: 36, pad: 4 }
  }[size] || { trackW: 64, trackH: 32, knobSize: 26, pad: 3 };

  const { trackW, trackH, knobSize, pad } = dims;
  const travelDistance = trackW - knobSize - pad * 2;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <div
      className={`theme-toggle-wrapper ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}
    >
      <motion.button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to daylight mode" : "Switch to midnight cyber mode"}
        onClick={toggleTheme}
        onKeyDown={handleKeyDown}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className={`celestial-toggle-btn ${isDark ? "mode-night" : "mode-day"}`}
        style={{
          width: `${trackW}px`,
          height: `${trackH}px`,
          padding: `${pad}px`
        }}
      >
        {/* Specular curved glass sheen overlay (React Bits Specular Highlight) */}
        <div className="celestial-specular-sheen" />

        {/* DAY SKY ELEMENTS: Layered Fluffy Drifting Clouds */}
        <AnimatePresence>
          {!isDark && (
            <motion.div
              key="day-clouds"
              className="celestial-clouds-group"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Soft background cloud */}
              <motion.div
                animate={{ x: [-1.5, 1.5, -1.5] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "6px",
                  bottom: "3px",
                  width: `${size === "sm" ? 22 : 28}px`,
                  height: `${size === "sm" ? 11 : 14}px`,
                  background: "rgba(255, 255, 255, 0.92)",
                  borderRadius: "9999px",
                  boxShadow: "0 2px 4px rgba(3, 105, 161, 0.25)"
                }}
              />
              {/* Foreground cloud puff center */}
              <motion.div
                animate={{ x: [-1, 2, -1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "11px",
                  bottom: "8px",
                  width: `${size === "sm" ? 13 : 16}px`,
                  height: `${size === "sm" ? 13 : 16}px`,
                  background: "#ffffff",
                  borderRadius: "50%",
                  boxShadow: "-1px -1px 2px rgba(255, 255, 255, 0.8)"
                }}
              />
              {/* Foreground cloud puff right */}
              <motion.div
                animate={{ x: [-2, 1, -2] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "19px",
                  bottom: "4px",
                  width: `${size === "sm" ? 12 : 15}px`,
                  height: `${size === "sm" ? 8 : 10}px`,
                  background: "#ffffff",
                  borderRadius: "9999px"
                }}
              />
              {/* Floating micro puff */}
              <motion.div
                animate={{ x: [0, -3, 0], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "4px",
                  top: "6px",
                  width: "7px",
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.75)",
                  borderRadius: "9999px"
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* NIGHT SKY ELEMENTS: Sparkling Stars & Shooting Star */}
        <AnimatePresence>
          {isDark && (
            <motion.div
              key="night-stars"
              className="celestial-stars-group"
              initial={{ opacity: 0, y: -6, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* Star 1: 4-Point Sparkle Star */}
              <motion.svg
                animate={{
                  scale: [0.75, 1.25, 0.75],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 45, 0]
                }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                viewBox="0 0 24 24"
                style={{
                  position: "absolute",
                  right: `${size === "sm" ? 11 : 14}px`,
                  top: "6px",
                  width: `${size === "sm" ? 10 : 12}px`,
                  height: `${size === "sm" ? 10 : 12}px`,
                  fill: "#38bdf8",
                  filter: "drop-shadow(0 0 3px #38bdf8)"
                }}
              >
                <path d="M12 0L14 9L23 12L14 15L12 24L10 15L1 12L10 9Z" />
              </motion.svg>

              {/* Star 2: Cyan twinkle dot */}
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                style={{
                  position: "absolute",
                  right: `${size === "sm" ? 23 : 28}px`,
                  top: "14px",
                  width: "2.5px",
                  height: "2.5px",
                  borderRadius: "50%",
                  background: "#22d3ee",
                  boxShadow: "0 0 4px #22d3ee"
                }}
              />

              {/* Star 3: Diamond gold star */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1.2, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                style={{
                  position: "absolute",
                  right: `${size === "sm" ? 8 : 10}px`,
                  bottom: "7px",
                  width: "2.5px",
                  height: "2.5px",
                  borderRadius: "50%",
                  background: "#fef08a",
                  boxShadow: "0 0 4px #fef08a"
                }}
              />

              {/* Star 4: Micro white sparkle */}
              <motion.div
                animate={{ opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                style={{
                  position: "absolute",
                  right: `${size === "sm" ? 19 : 22}px`,
                  bottom: "5px",
                  width: "1.5px",
                  height: "1.5px",
                  borderRadius: "50%",
                  background: "#ffffff"
                }}
              />

              {/* Subtle Shooting Star Streak */}
              <motion.div
                className="shooting-star-streak"
                animate={{
                  x: [-20, 40],
                  y: [-10, 20],
                  opacity: [0, 0.9, 0]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: "easeOut"
                }}
                style={{
                  top: "8px",
                  right: "18px"
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CELESTIAL SLIDER KNOB (Moon on Left in Dark, Sun on Right in Light) */}
        <motion.div
          className="celestial-knob"
          animate={{
            x: isDark ? 0 : travelDistance
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 24,
            mass: 0.85
          }}
          style={{
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            background: isDark
              ? "radial-gradient(circle at 35% 35%, #f8fafc 0%, #e2e8f0 40%, #94a3b8 78%, #475569 100%)"
              : "radial-gradient(circle at 35% 35%, #fffbeb 0%, #fef08a 25%, #f59e0b 72%, #d97706 100%)",
            border: isDark ? "1px solid rgba(241, 245, 249, 0.9)" : "1px solid rgba(254, 240, 138, 0.9)",
            boxShadow: isDark
              ? "0 2px 8px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.45), inset -1.5px -1.5px 3px rgba(30, 41, 59, 0.6)"
              : "0 2px 10px rgba(217, 119, 6, 0.45), 0 0 16px rgba(245, 158, 11, 0.65), 0 0 24px rgba(251, 191, 36, 0.4), inset -1.5px -1.5px 3px rgba(180, 83, 9, 0.5)"
          }}
        >
          {/* DAY MODE: Spinning Sun Corona / Solar Flare Rays */}
          <AnimatePresence>
            {!isDark && (
              <motion.div
                key="sun-corona"
                className="sun-corona-ring"
                initial={{ scale: 0, rotate: -90, opacity: 0 }}
                animate={{ scale: 1, rotate: 360, opacity: 1 }}
                exit={{ scale: 0, rotate: 90, opacity: 0 }}
                transition={{
                  scale: { duration: 0.3 },
                  rotate: { duration: 18, repeat: Infinity, ease: "linear" }
                }}
              >
                <svg
                  viewBox="0 0 36 36"
                  style={{
                    width: `${knobSize + 10}px`,
                    height: `${knobSize + 10}px`,
                    position: "absolute"
                  }}
                >
                  {/* 8 Golden Solar Ray Petals */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <line
                      key={angle}
                      x1="18"
                      y1="2"
                      x2="18"
                      y2="5.5"
                      stroke="#fbbf24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      transform={`rotate(${angle} 18 18)`}
                      filter="drop-shadow(0 0 2px #f59e0b)"
                    />
                  ))}
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NIGHT MODE: Realistic Handcrafted Lunar Craters */}
          <AnimatePresence>
            {isDark && (
              <motion.div
                key="moon-craters"
                initial={{ opacity: 0, rotate: -40, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 40, scale: 0.7 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  overflow: "hidden"
                }}
              >
                {/* Crater 1 (Top-Right Major Crater) */}
                <div
                  className="celestial-crater"
                  style={{
                    width: `${knobSize * 0.24}px`,
                    height: `${knobSize * 0.24}px`,
                    top: `${knobSize * 0.16}px`,
                    right: `${knobSize * 0.22}px`
                  }}
                />

                {/* Crater 2 (Bottom-Center Secondary Crater) */}
                <div
                  className="celestial-crater"
                  style={{
                    width: `${knobSize * 0.16}px`,
                    height: `${knobSize * 0.16}px`,
                    bottom: `${knobSize * 0.2}px`,
                    right: `${knobSize * 0.36}px`
                  }}
                />

                {/* Crater 3 (Bottom-Right Micro Crater) */}
                <div
                  className="celestial-crater"
                  style={{
                    width: `${knobSize * 0.12}px`,
                    height: `${knobSize * 0.12}px`,
                    bottom: `${knobSize * 0.16}px`,
                    right: `${knobSize * 0.16}px`
                  }}
                />

                {/* Soft Lunar Eclipse Crescent Shadow */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 75% 75%, rgba(15, 23, 42, 0.45) 0%, transparent 65%)",
                    pointerEvents: "none"
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Knob Specular Highlight (Glass lens shine) */}
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: "4px",
              width: `${knobSize * 0.45}px`,
              height: `${knobSize * 0.3}px`,
              borderRadius: "50%",
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 100%)",
              transform: "rotate(-25deg)",
              pointerEvents: "none",
              zIndex: 4
            }}
          />
        </motion.div>
      </motion.button>

      {showLabel && (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-secondary)",
            letterSpacing: "0.03em",
            textTransform: "uppercase"
          }}
        >
          {isDark ? "Midnight" : "Daylight"}
        </span>
      )}
    </div>
  );
}
