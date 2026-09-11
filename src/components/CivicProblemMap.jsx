import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Flame,
  RefreshCw,
  Search,
  MapPin,
  RotateCcw,
  Layers,
  Compass,
  Radio,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { civicStore } from "../lib/civicStore";
import { createHeatLayer } from "../lib/leafletHeat";
import { getMapTilerTileUrl, MAPTILER_ATTRIBUTION } from "../lib/mapTiler";
import MapLegend from "./MapLegend";
import MapIncidentDetailPanel from "./MapIncidentDetailPanel";
import { useTheme } from "../lib/themeContext";
import "./heatmap.css";

// Fix Leaflet marker icon asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Kolkata default view
const KOLKATA_CENTER = [22.5726, 88.3639];
const DEFAULT_ZOOM = 12;

// MapTiler Cloud Tile Providers
const TILE_LAYERS = {
  dark: {
    name: "MapTiler Dark",
    style: "streets-v2-dark",
  },
  dataviz: {
    name: "MapTiler Dataviz",
    style: "dataviz-dark",
  },
  standard: {
    name: "MapTiler Streets",
    style: "streets-v2",
  },
};

// High-Density Zones in Kolkata for rapid navigation
const KOLKATA_HOTSPOT_ZONES = [
  { name: "Salt Lake Sec V", coords: [22.5735, 88.4331], zoom: 14, tag: "IT & Tech Hub" },
  { name: "Park St / Esplanade", coords: [22.5516, 88.3524], zoom: 14, tag: "Central Transit" },
  { name: "Howrah Corridor", coords: [22.5850, 88.3412], zoom: 14, tag: "Transit Hub" },
  { name: "Gariahat Crossing", coords: [22.5186, 88.3653], zoom: 14, tag: "South Arterial" },
  { name: "Ultadanga Junction", coords: [22.5975, 88.3980], zoom: 14, tag: "North Arterial" },
];

// Severity weight scale: low=1, medium=2, high=4, critical=7
const getSeverityWeight = (severity) => {
  const s = (severity || "").toLowerCase();
  if (s.includes("crit")) return 7;
  if (s.includes("high")) return 4;
  if (s.includes("med")) return 2;
  return 1;
};

// Heatmap gradient matching the dark cyber UI: Green -> Yellow -> Orange -> Red -> Crimson
const HEATMAP_GRADIENT = {
  0.2: "#22c55e",
  0.4: "#84cc16",
  0.6: "#eab308",
  0.75: "#f97316",
  0.9: "#ef4444",
  1.0: "#b91c1c",
};

export default function CivicProblemMap() {
  const mapContainerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const tileLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const hotspotMarkersRef = useRef([]);

  // Data states
  const [reports, setReports] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Map view mode states
  const { theme } = useTheme();
  const tileMode = theme === "light" ? "standard" : "dark"; // auto-sync with theme
  const [showHotspotPins, setShowHotspotPins] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Selected cluster/interaction state
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Fetch reports from Supabase & civicStore
  const fetchReportsData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await civicStore.getReportsForHeatmap();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("CivicProblemMap: Reports fetch notice:", err.message);
      const fallback = civicStore.getAllReports();
      setReports(fallback);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load + Real-time sync listener (Supabase postgres_changes + civicStore)
  useEffect(() => {
    let isMounted = true;
    civicStore
      .getReportsForHeatmap()
      .then((data) => {
        if (isMounted) {
          setReports(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReports(civicStore.getAllReports());
        }
      });

    // 1. Subscribe to local civicStore events
    const unsubStore = civicStore.subscribe(() => {
      fetchReportsData();
    });

    // 2. Subscribe to Supabase Realtime channel for live reports
    let realtimeChannel = null;
    try {
      realtimeChannel = supabase
        .channel("public:reports:heatmap_osm")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reports" },
          () => {
            fetchReportsData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("CivicProblemMap: Realtime subscription notice:", err.message);
    }

    return () => {
      isMounted = false;
      unsubStore();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel).catch(() => {});
      }
    };
  }, [fetchReportsData]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (categoryFilter !== "all" && r.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (severityFilter !== "all" && r.severity?.toLowerCase() !== severityFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && r.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (r.title || "").toLowerCase().includes(q);
        const matchLoc = (r.location || "").toLowerCase().includes(q);
        const matchDesc = (r.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }
      return true;
    });
  }, [reports, categoryFilter, severityFilter, statusFilter, searchQuery]);

  // Handle clicking on a map coordinate or hotspot to inspect cluster
  const inspectHotspotAt = useCallback(
    (lat, lng) => {
      const nearby = filteredReports.filter((r) => {
        const dLat = r.latitude - lat;
        const dLng = r.longitude - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        // Roughly 0.008 degrees ~ 800 meters radius
        return dist <= 0.008;
      });

      if (nearby.length === 0) {
        setSelectedCluster(null);
        return;
      }

      // Determine dominant category
      const catCounts = {};
      nearby.forEach((r) => {
        const c = r.category || "General Concern";
        catCounts[c] = (catCounts[c] || 0) + 1;
      });
      const dominantCategory = Object.keys(catCounts).reduce((a, b) =>
        catCounts[a] > catCounts[b] ? a : b
      );

      // Determine highest severity
      let highestSeverity = "Low";
      const sevRanks = { critical: 4, high: 3, medium: 2, low: 1 };
      let maxRank = 0;
      nearby.forEach((r) => {
        const s = (r.severity || "Low").toLowerCase();
        const rank = sevRanks[s] || 1;
        if (rank > maxRank) {
          maxRank = rank;
          highestSeverity = r.severity || "Medium";
        }
      });

      // Determine latest report date
      const sortedByDate = [...nearby].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestDate = sortedByDate[0]?.created_at || new Date().toISOString();
      let computedTimeAgo = "Recent";
      try {
        const ms = Date.now() - new Date(latestDate).getTime();
        const mins = Math.floor(ms / (1000 * 60));
        if (mins < 60) computedTimeAgo = `${mins <= 0 ? 1 : mins}m ago`;
        else {
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) computedTimeAgo = `${hrs}h ago`;
          else {
            const days = Math.floor(hrs / 24);
            computedTimeAgo = `${days}d ago`;
          }
        }
      } catch {
        computedTimeAgo = "Recent";
      }

      // Primary location label
      const locName = nearby[0]?.location || "Kolkata Civic Sector";

      // Intensity Level
      let intensityLevel = "Low";
      if (nearby.length >= 10) intensityLevel = "Critical";
      else if (nearby.length >= 6) intensityLevel = "High";
      else if (nearby.length >= 2) intensityLevel = "Moderate";

      setSelectedCluster({
        location: locName,
        reportsCount: nearby.length,
        dominantCategory,
        highestSeverity,
        latestReportDate: latestDate,
        timeAgo: computedTimeAgo,
        intensityLevel,
        reports: nearby,
        lat,
        lng,
      });
    },
    [filteredReports]
  );

  // Initialize Leaflet Map with MapTiler Cloud tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map = null;
    let resizeObserver = null;

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    try {
      map = L.map(mapContainerRef.current, {
        center: KOLKATA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: true,
      });

      // Add initial base MapTiler Cloud tile layer (streets-v2-dark)
      const tileLayer = L.tileLayer(getMapTilerTileUrl("streets-v2-dark"), {
        maxZoom: 19,
        tileSize: 256,
        attribution: MAPTILER_ATTRIBUTION,
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      // Leaflet click handler to inspect nearby hotspots
      map.on("click", (e) => {
        if (e.latlng) {
          inspectHotspotAt(e.latlng.lat, e.latlng.lng);
        }
      });

      // Ensure proper map sizing
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 150);

      if (window.ResizeObserver && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (map) map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      requestAnimationFrame(() => {
        setMapInstance(map);
      });
    } catch (err) {
      console.warn("CivicProblemMap Leaflet initialization notice:", err.message);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (map) {
        map.remove();
        setMapInstance(null);
        tileLayerRef.current = null;
        heatLayerRef.current = null;
      }
    };
  }, [inspectHotspotAt]);

  // Update Tile Layer when tileMode changes (Dark vs Dataviz vs Streets)
  useEffect(() => {
    if (!mapInstance) return;

    if (tileLayerRef.current) {
      mapInstance.removeLayer(tileLayerRef.current);
    }

    const currentLayer = TILE_LAYERS[tileMode] || TILE_LAYERS.dark;
    const newTileLayer = L.tileLayer(getMapTilerTileUrl(currentLayer.style), {
      maxZoom: 19,
      tileSize: 256,
      attribution: MAPTILER_ATTRIBUTION,
    }).addTo(mapInstance);
    tileLayerRef.current = newTileLayer;
  }, [mapInstance, tileMode]);

  // Update Heatmap Layer whenever mapInstance, filteredReports, or showHeatmap changes
  useEffect(() => {
    if (!mapInstance) return;

    // Remove existing heatmap layer
    if (heatLayerRef.current) {
      mapInstance.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || filteredReports.length === 0) return;

    // Prepare weighted points: [lat, lng, weight]
    const heatPoints = filteredReports
      .filter((r) => r.latitude && r.longitude)
      .map((r) => [r.latitude, r.longitude, getSeverityWeight(r.severity)]);

    if (heatPoints.length === 0) return;

    try {
      const heat = createHeatLayer(heatPoints, {
        radius: 40,
        blur: 26,
        max: 6,
        minOpacity: 0.35,
        gradient: HEATMAP_GRADIENT,
      });

      heat.addTo(mapInstance);
      heatLayerRef.current = heat;
    } catch (err) {
      console.warn("Leaflet HeatLayer update notice:", err.message);
    }
  }, [mapInstance, filteredReports, showHeatmap]);

  // Update Interactive Hotspot Cluster Pins
  useEffect(() => {
    if (!mapInstance) return;

    // Clear previous markers
    hotspotMarkersRef.current.forEach((m) => m.remove());
    hotspotMarkersRef.current = [];

    if (!showHotspotPins) return;

    // Cluster reports into distinct geographic nodes (~500m proximity)
    const clusterNodes = [];
    filteredReports.forEach((r) => {
      if (!r.latitude || !r.longitude) return;

      const existing = clusterNodes.find((node) => {
        const dLat = node.lat - r.latitude;
        const dLng = node.lng - r.longitude;
        return Math.sqrt(dLat * dLat + dLng * dLng) <= 0.005;
      });

      if (existing) {
        existing.count += 1;
        existing.reports.push(r);
        const s = (r.severity || "").toLowerCase();
        if (s.includes("crit")) existing.hasCritical = true;
        else if (s.includes("high")) existing.hasHigh = true;
      } else {
        const s = (r.severity || "").toLowerCase();
        clusterNodes.push({
          lat: r.latitude,
          lng: r.longitude,
          count: 1,
          reports: [r],
          hasCritical: s.includes("crit"),
          hasHigh: s.includes("high"),
          location: r.location || "Kolkata Sector",
        });
      }
    });

    clusterNodes.forEach((node) => {
      let pinClass = "pin-cyan";
      if (node.hasCritical) pinClass = "pin-danger";
      else if (node.hasHigh) pinClass = "pin-warning";

      const markerHtml = `
        <div class="osm-hotspot-pin ${pinClass}" title="${node.location} (${node.count} reports)">
          <div class="osm-pin-pulse"></div>
          <div class="osm-pin-core">
            <span>${node.count}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "osm-marker-container",
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(mapInstance);

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        inspectHotspotAt(node.lat, node.lng);
        mapInstance.panTo([node.lat, node.lng]);
      });

      hotspotMarkersRef.current.push(marker);
    });
  }, [mapInstance, filteredReports, showHotspotPins, inspectHotspotAt]);

  // Unique filter dropdown options
  const categories = useMemo(() => {
    const set = new Set(["all"]);
    reports.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [reports]);

  const severities = ["all", "Critical", "High", "Medium", "Low"];
  const statuses = ["all", "pending", "in_progress", "resolved"];

  const handleResetFilters = () => {
    setCategoryFilter("all");
    setSeverityFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleFocusKolkata = () => {
    if (mapInstance) {
      mapInstance.flyTo(KOLKATA_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
    }
  };

  const handleFlyToZone = (coords, zoom) => {
    if (mapInstance) {
      mapInstance.flyTo(coords, zoom, { duration: 1 });
      inspectHotspotAt(coords[0], coords[1]);
    }
  };

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };

  return (
    <div className="civic-heatmap-container">
      {/* Header & Command Center Card */}
      <div className="heatmap-header-card">
        <div className="heatmap-header-top">
          <div className="heatmap-title-group">
            <div className="heatmap-title-row">
              <div className="heatmap-badge-icon">
                <Flame size={18} />
              </div>
              <h2 className="heatmap-main-heading">Civic Problem Intelligence Map</h2>
              <div className="osm-verified-badge" title="Powered by MapTiler Cloud">
                <Compass size={12} />
                <span>MapTiler Cloud Live</span>
              </div>
            </div>
            <p className="heatmap-subheading">
              Real-time civic complaint density across Kolkata powered by MapTiler Cloud. Areas with
              higher problem volume progressively intensify from green to crimson.
            </p>
          </div>

          {/* Real-time Stats & Refresh */}
          <div className="heatmap-stats-strip">
            <div className="stat-pill">
              <span>Active Reports:</span>
              <strong>{filteredReports.length}</strong>
            </div>

            <div className="stat-pill realtime-pill">
              <span className="realtime-pulse-dot" />
              <span>Real-Time Sync Active</span>
            </div>

            <button
              type="button"
              className={`refresh-action-btn ${isRefreshing ? "refreshing" : ""}`}
              onClick={fetchReportsData}
              title="Refresh complaint telemetry feed"
              disabled={isRefreshing}
            >
              <RefreshCw size={13} />
              <span>{isRefreshing ? "Syncing..." : "Refresh Feed"}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="heatmap-filter-bar">
          <div className="filter-group">
            <label htmlFor="heatmap-cat-filter">Category:</label>
            <select
              id="heatmap-cat-filter"
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="heatmap-sev-filter">Severity:</label>
            <select
              id="heatmap-sev-filter"
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              {severities.map((sev) => (
                <option key={sev} value={sev}>
                  {sev === "all" ? "All Severities" : `${sev} Priority`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="heatmap-status-filter">Status:</label>
            <select
              id="heatmap-status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st === "all" ? "All Statuses" : st.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ flex: "2 1 220px" }}>
            <label htmlFor="heatmap-search">Search:</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="heatmap-search"
                type="text"
                className="filter-select"
                placeholder="Search sector, street, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "28px" }}
              />
              <Search
                size={13}
                style={{ position: "absolute", left: "9px", top: "10px", color: "#64748b" }}
              />
            </div>
          </div>

          {(categoryFilter !== "all" ||
            severityFilter !== "all" ||
            statusFilter !== "all" ||
            searchQuery) && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={handleResetFilters}
            >
              <RotateCcw size={12} style={{ display: "inline", marginRight: "4px" }} />
              Reset Filters
            </button>
          )}
        </div>

        {/* High-Density Zone Shortcut Quick Chips */}
        <div className="hotspot-zone-chips-bar">
          <span className="zone-chips-label">
            <Radio size={12} style={{ display: "inline", marginRight: "5px" }} />
            High-Density Zones:
          </span>
          <div className="zone-chips-list">
            {KOLKATA_HOTSPOT_ZONES.map((zone) => (
              <button
                key={zone.name}
                type="button"
                className="zone-chip-btn"
                onClick={() => handleFlyToZone(zone.coords, zone.zoom)}
              >
                <span>{zone.name}</span>
                <span className="zone-chip-tag">{zone.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="map-viewport-wrapper">
        {/* OpenStreetMap Leaflet Canvas Container */}
        <div ref={mapContainerRef} className="osm-map-element" />

        {/* Floating Custom Zoom Controls */}
        <div className="osm-zoom-controls">
          <button
            type="button"
            className="osm-zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="osm-zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            &minus;
          </button>
        </div>

        {/* Floating Layer & View Mode Controls */}
        <div className="map-floating-controls">
          <button
            type="button"
            className="map-control-btn"
            onClick={handleFocusKolkata}
            title="Recenter view on Kolkata Metro"
          >
            <MapPin size={14} />
            <span>Center Kolkata</span>
          </button>

          <button
            type="button"
            className="map-control-btn active"
            onClick={() =>
              setTileMode((prev) =>
                prev === "dark" ? "dataviz" : prev === "dataviz" ? "standard" : "dark"
              )
            }
            title="Toggle between MapTiler styles (Dark / Dataviz / Streets)"
          >
            <Layers size={14} />
            <span>
              {tileMode === "dark"
                ? "🌙 Dark Map"
                : tileMode === "dataviz"
                ? "📊 Dataviz"
                : "🗺️ Streets"}
            </span>
          </button>

          <button
            type="button"
            className={`map-control-btn ${showHeatmap ? "active" : ""}`}
            onClick={() => setShowHeatmap((prev) => !prev)}
            title="Toggle Heatmap visualization"
          >
            {showHeatmap ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>Heatmap</span>
          </button>

          <button
            type="button"
            className={`map-control-btn ${showHotspotPins ? "active" : ""}`}
            onClick={() => setShowHotspotPins((prev) => !prev)}
            title="Toggle Hotspot Cluster Pins"
          >
            <Radio size={14} />
            <span>Pins</span>
          </button>
        </div>

        {/* Floating Heatmap Intensity Legend */}
        <MapLegend />

        {/* Floating Hotspot Detail Inspection Panel */}
        {selectedCluster && (
          <MapIncidentDetailPanel
            clusterData={selectedCluster}
            onClose={() => setSelectedCluster(null)}
          />
        )}
      </div>
    </div>
  );
}
