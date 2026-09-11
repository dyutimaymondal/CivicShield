/**
 * Safe, asynchronous loader for Google Maps JavaScript API
 * Handles missing key, script injection, deduplication, and auth failure callbacks.
 */

let loadPromise = null;
let authFailureRegistered = false;
let authFailureCallback = null;

export function registerGmAuthFailureHandler(callback) {
  authFailureCallback = callback;
}

export function isGoogleMapsLoaded() {
  return typeof window !== "undefined" && !!(window.google && window.google.maps);
}

export function loadGoogleMapsApi(customApiKey = null) {
  const envKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || "";
  const apiKey = (customApiKey || envKey).trim();

  // If already available on window, resolve immediately
  if (isGoogleMapsLoaded()) {
    return Promise.resolve(window.google.maps);
  }

  // Validate API key presence
  if (!apiKey || apiKey === "your-google-maps-api-key" || apiKey === "YOUR_API_KEY") {
    return Promise.reject({
      code: "MISSING_KEY",
      message: "Google Maps API key is missing or not configured in environment variables."
    });
  }

  // Return existing pending promise if already initiated
  if (loadPromise) {
    return loadPromise;
  }

  // Catch Google Maps global authentication failure (e.g. invalid key, billing, domain lock)
  if (typeof window !== "undefined" && !authFailureRegistered) {
    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn("CivicShield: Google Maps API key authentication failure (gm_authFailure triggered).");
      if (typeof prevAuthFailure === "function") prevAuthFailure();
      if (typeof authFailureCallback === "function") {
        authFailureCallback({
          code: "AUTH_FAILURE",
          message: "Google Maps authentication failed. Please verify API key validity, billing status, and allowed HTTP referrers."
        });
      }
    };
    authFailureRegistered = true;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if script tag is already in DOM
    const existingScript = document.querySelector('script[data-civic-maps="true"]');
    if (existingScript) {
      if (isGoogleMapsLoaded()) {
        resolve(window.google.maps);
        return;
      }
      existingScript.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject({ code: "LOAD_ERROR", message: "Google Maps loaded without maps namespace." });
      });
      existingScript.addEventListener("error", () => {
        reject({ code: "LOAD_ERROR", message: "Failed to download Google Maps script." });
      });
      return;
    }

    const callbackName = `__civicshield_init_map_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject({ code: "LOAD_ERROR", message: "Google Maps object unavailable after load callback." });
      }
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-civic-maps", "true");

    script.onerror = (err) => {
      delete window[callbackName];
      loadPromise = null;
      reject({
        code: "NETWORK_ERROR",
        message: "Failed to load Google Maps script. Please check your internet connection or network firewall.",
        originalError: err
      });
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
