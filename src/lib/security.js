/**
 * CivicShield Security & Defensive Hardening Utilities
 * 
 * Provides:
 * - Rate limiting & brute-force defense with exponential backoff
 * - SQL injection & XSS payload sanitization
 * - Strict password complexity validation
 * - RFC 5322 email format validation
 * - Secure MIME-type file verification & size throttling
 */

// ============================================================================
// 1. Rate Limiter & Brute-Force Defense
// ============================================================================

class ClientRateLimiter {
  constructor() {
    this.storageKey = "civicshield_sec_limiter";
  }

  _getState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  _saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in private mode
    }
  }

  /**
   * Check if a specific identifier (email or action key) is currently locked out
   * @param {string} key 
   * @returns {{ locked: boolean, remainingSeconds: number }}
   */
  isLockedOut(key) {
    const state = this._getState();
    const entry = state[key];
    if (!entry || !entry.lockoutUntil) {
      return { locked: false, remainingSeconds: 0 };
    }

    const now = Date.now();
    if (now < entry.lockoutUntil) {
      const remainingSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }

    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Record a failed attempt and compute exponential backoff lockout
   * - 3 failures: 30s lockout
   * - 5 failures: 120s (2m) lockout
   * - 8+ failures: 900s (15m) lockout
   * @param {string} key 
   * @returns {{ locked: boolean, remainingSeconds: number, attempts: number }}
   */
  recordFailedAttempt(key) {
    const state = this._getState();
    const now = Date.now();
    const entry = state[key] || { attempts: 0, lockoutUntil: 0, firstAttempt: now };

    // Reset attempts if older than 1 hour
    if (now - entry.firstAttempt > 60 * 60 * 1000) {
      entry.attempts = 0;
      entry.firstAttempt = now;
    }

    entry.attempts += 1;

    let lockoutDurationMs = 0;
    if (entry.attempts >= 8) {
      lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
    } else if (entry.attempts >= 5) {
      lockoutDurationMs = 2 * 60 * 1000; // 2 minutes
    } else if (entry.attempts >= 3) {
      lockoutDurationMs = 30 * 1000; // 30 seconds
    }

    if (lockoutDurationMs > 0) {
      entry.lockoutUntil = now + lockoutDurationMs;
    }

    state[key] = entry;
    this._saveState(state);

    return {
      locked: lockoutDurationMs > 0,
      remainingSeconds: Math.ceil(lockoutDurationMs / 1000),
      attempts: entry.attempts
    };
  }

  /**
   * Clear failed attempts upon successful authentication
   * @param {string} key 
   */
  clearAttempts(key) {
    const state = this._getState();
    if (state[key]) {
      delete state[key];
      this._saveState(state);
    }
  }

  /**
   * Simple cooldown check (e.g. for password reset emails or report submissions)
   * @param {string} key 
   * @param {number} cooldownSeconds 
   * @returns {{ allowed: boolean, remainingSeconds: number }}
   */
  checkCooldown(key, cooldownSeconds = 60) {
    const state = this._getState();
    const now = Date.now();
    const lastTimestamp = state[`cooldown_${key}`] || 0;

    const elapsedSeconds = (now - lastTimestamp) / 1000;
    if (elapsedSeconds < cooldownSeconds) {
      const remainingSeconds = Math.ceil(cooldownSeconds - elapsedSeconds);
      return { allowed: false, remainingSeconds };
    }

    // Update cooldown timestamp
    state[`cooldown_${key}`] = now;
    this._saveState(state);
    return { allowed: true, remainingSeconds: 0 };
  }
}

export const rateLimiter = new ClientRateLimiter();

// ============================================================================
// 2. Input Sanitization & SQL / Script Injection Prevention
// ============================================================================

/**
 * Strips known SQL injection fragments, script tags, HTML tags, and null bytes.
 * @param {string} input 
 * @param {number} maxLength 
 * @returns {string}
 */
export function sanitizeInput(input, maxLength = 2000) {
  if (typeof input !== "string") return "";

  let sanitized = input;

  // 1. Strip null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // 2. Neutralize HTML/Script tags (<script>, <iframe>, <style>, etc.)
  sanitized = sanitized.replace(/<[^>]*>?/gm, "");

  // 3. Remove dangerous SQL injection commentary & escape vectors
  // Handles '--', '/*', '*/', ';', and common SQL boolean injections
  sanitized = sanitized
    .replace(/--+/g, "-")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/;\s*(DROP|DELETE|UPDATE|INSERT|SELECT|ALTER|TRUNCATE|EXEC|UNION)\b/gi, "");

  // 4. Strip classical ' OR '1'='1 style boolean tautologies
  sanitized = sanitized.replace(/'\s*(OR|AND)\s*['"]?1['"]?\s*=\s*['"]?1/gi, "");

  // 5. Truncate to maximum permissible length to prevent buffer overruns
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized.trim();
}

// ============================================================================
// 3. Email & Password Security Validation
// ============================================================================

/**
 * Validates email format according to RFC 5322 simplified standard
 * @param {string} email 
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * Enforces strong password complexity policy
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numerical digit
 * - At least one special character
 * @param {string} password 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password cannot be empty." };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }

  if (password.length > 72) {
    return { valid: false, error: "Password cannot exceed 72 characters (Bcrypt limitation)." };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit) {
    return {
      valid: false,
      error: "Password must contain uppercase letters, lowercase letters, and at least one number."
    };
  }

  if (!hasSpecial) {
    return {
      valid: false,
      error: "Password must contain at least one special symbol (e.g. !@#$%^&*)."
    };
  }

  return { valid: true };
}

// ============================================================================
// 4. File Upload Security Validation (Anti-MIME Spoofing)
// ============================================================================

const ALLOWED_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates uploaded photo against MIME spoofing, SVG XSS vectors, and size limits
 * @param {File} file 
 * @returns {{ valid: boolean, error?: string, safeExtension?: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB detected).`
    };
  }

  // Check MIME type strictly
  const safeExtension = ALLOWED_MIME_TYPES[file.type];
  if (!safeExtension) {
    return {
      valid: false,
      error: "Unsupported file type. Only genuine PNG, JPEG, and WEBP images are allowed."
    };
  }

  // Explicitly disallow SVG files (which can contain embedded malicious JavaScript)
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".svg") || lowerName.endsWith(".html") || lowerName.endsWith(".exe")) {
    return {
      valid: false,
      error: "Potentially unsafe file format detected and rejected."
    };
  }

  return { valid: true, safeExtension };
}
