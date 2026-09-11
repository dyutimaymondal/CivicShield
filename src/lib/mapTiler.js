/**
 * MapTiler Cloud Tile Provider Helper
 * Generates high-resolution raster tile URLs powered by MapTiler Cloud.
 */

export const getMapTilerKey = () => {
  return import.meta.env?.VITE_MAPTILER_API_KEY || "";
};

export const isMapTilerConfigured = () => {
  const key = getMapTilerKey();
  return Boolean(key && key !== "your-maptiler-api-key");
};

/**
 * Returns the MapTiler tile URL for a given style.
 * Fallback to standard OpenStreetMap if API key is not configured.
 */
export const getMapTilerTileUrl = (style = "streets-v2-dark") => {
  const key = getMapTilerKey();
  if (!key || key === "your-maptiler-api-key") {
    return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  }
  return `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${key}`;
};

export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';
