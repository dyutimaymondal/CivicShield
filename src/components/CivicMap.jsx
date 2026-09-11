import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getMapTilerTileUrl, MAPTILER_ATTRIBUTION } from "../lib/mapTiler";

// Fix Leaflet marker icon asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function CivicMap({ incidents = [], onSelectIncident, selectedIncidentId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
      try {
        const map = L.map(mapContainerRef.current, {
          center: [28.6139, 77.2090],
          zoom: 13,
          zoomControl: true,
          attributionControl: true
        });

        // MapTiler Cloud Dark Tile Layer
        L.tileLayer(getMapTilerTileUrl("streets-v2-dark"), {
          maxZoom: 19,
          tileSize: 256,
          attribution: MAPTILER_ATTRIBUTION,
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (err) {
        console.warn("CivicMap initialization notice:", err.message);
      }
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create markers for each incident
    const bounds = [];

    incidents.forEach((inc) => {
      const lat = inc.latitude || 28.6139 + (Math.random() - 0.5) * 0.04;
      const lng = inc.longitude || 77.2090 + (Math.random() - 0.5) * 0.04;
      bounds.push([lat, lng]);

      const isSelected = selectedIncidentId === inc.id;
      const sev = (inc.severity || "").toLowerCase();
      let colorClass = "cyan";
      if (sev.includes("crit") || sev.includes("high")) colorClass = "danger";
      else if (sev.includes("med")) colorClass = "warning";

      // Custom pulsing HTML marker
      const markerHtml = `
        <div class="custom-map-pin ${colorClass} ${isSelected ? "selected" : ""}">
          <div class="pin-pulse"></div>
          <div class="pin-dot">
            <span>${inc.count || 1}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Popup
      const popupContent = `
        <div class="map-popup-card">
          <h4>${inc.title}</h4>
          <span class="popup-cat">${inc.category}</span>
          <p>${inc.location || "Sector Coordinate"}</p>
          <div class="popup-meta">
            <span><strong>${inc.count || 1}</strong> Reports Clustered</span>
            <span>Priority: <strong>${((inc.priority_score || 0.75) * 100).toFixed(0)}%</strong></span>
          </div>
          <button class="popup-select-btn" id="map-btn-${inc.id}">Inspect Incident & Demand</button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`map-btn-${inc.id}`);
        if (btn && onSelectIncident) {
          btn.onclick = () => onSelectIncident(inc);
        }
      });

      marker.on("click", () => {
        if (onSelectIncident) onSelectIncident(inc);
      });

      markersRef.current.push(marker);
    });

    if (bounds.length > 0 && map) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch {
        // ignore bounds errors on fast unmount
      }
    }
  }, [incidents, selectedIncidentId, onSelectIncident]);

  return (
    <div className="civic-map-wrapper">
      <div ref={mapContainerRef} className="civic-leaflet-container" />
      <div className="map-overlay-legend">
        <span className="legend-label">Civic Telemetry Cluster</span>
        <div className="legend-items">
          <span className="legend-item"><span className="dot danger" /> Critical / High Priority</span>
          <span className="legend-item"><span className="dot warning" /> Medium Priority</span>
          <span className="legend-item"><span className="dot cyan" /> Standard Triage</span>
        </div>
      </div>
    </div>
  );
}
