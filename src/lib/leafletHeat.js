import L from "leaflet";

/**
 * High-Performance Canvas Heatmap Engine for Leaflet & Civic Intelligence
 * Provides radiant, multi-stop kernel density visualization with zero API keys.
 */

// Generate 256-step RGBA color lookup table from color stops
function buildGradientPalette(gradStops) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new Uint8ClampedArray(1024);

    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    for (const stop in gradStops) {
      gradient.addColorStop(parseFloat(stop), gradStops[stop]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, 256);

    return ctx.getImageData(0, 0, 1, 256).data;
  } catch {
    return new Uint8ClampedArray(1024);
  }
}

// Generate cached radial gradient stamp for point accumulation
function buildRadialStamp(radius, blur) {
  try {
    const r = Math.max(1, radius + blur);
    const canvas = document.createElement("canvas");
    canvas.width = r * 2;
    canvas.height = r * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { canvas, r };

    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(0, 0, 0, 1)");
    grad.addColorStop(Math.min(0.8, radius / r), "rgba(0, 0, 0, 0.65)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.fill();

    return { canvas, r };
  } catch {
    return { canvas: document.createElement("canvas"), r: radius };
  }
}

const DEFAULT_GRADIENT = {
  0.15: "#22c55e", // Green (Low)
  0.35: "#84cc16", // Lime
  0.55: "#eab308", // Yellow (Moderate)
  0.75: "#f97316", // Orange (High)
  0.9: "#ef4444",  // Red (Critical)
  1.0: "#b91c1c",  // Crimson (Extreme Density)
};

/**
 * Leaflet HeatLayer
 */
const HeatLayer = (L.Layer || L.Class).extend({
  options: {
    radius: 35,
    blur: 25,
    max: 8,
    minOpacity: 0.25,
    gradient: DEFAULT_GRADIENT,
  },

  initialize: function (latlngs, options) {
    this._latlngs = latlngs || [];
    L.setOptions(this, options);
    this._palette = buildGradientPalette(this.options.gradient || DEFAULT_GRADIENT);
    this._stamp = buildRadialStamp(this.options.radius, this.options.blur);
  },

  setLatLngs: function (latlngs) {
    this._latlngs = latlngs || [];
    return this.redraw();
  },

  addLatLng: function (latlng) {
    if (!this._latlngs) this._latlngs = [];
    this._latlngs.push(latlng);
    return this.redraw();
  },

  setOptions: function (options) {
    L.setOptions(this, options);
    if (options.gradient) {
      this._palette = buildGradientPalette(options.gradient);
    }
    if (options.radius !== undefined || options.blur !== undefined) {
      this._stamp = buildRadialStamp(this.options.radius, this.options.blur);
    }
    return this.redraw();
  },

  redraw: function () {
    if (!this._canvas || !this._map || this._frame) return this;
    this._frame = L.Util.requestAnimFrame(this._redraw, this);
    return this;
  },

  onAdd: function (map) {
    this._map = map;
    if (!this._canvas) {
      this._initCanvas();
    }
    const pane = map.getPane ? map.getPane("overlayPane") : (map._panes && map._panes.overlayPane);
    if (pane && this._canvas) {
      pane.appendChild(this._canvas);
    }

    map.on("moveend", this._reset, this);
    map.on("viewreset", this._reset, this);
    map.on("resize", this._reset, this);

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.on("zoomanim", this._animateZoom, this);
    }

    if (map._loaded) {
      this._reset();
    } else {
      map.once("load", this._reset, this);
    }
  },

  onRemove: function (map) {
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    map.off("moveend", this._reset, this);
    map.off("viewreset", this._reset, this);
    map.off("resize", this._reset, this);

    if (map.options.zoomAnimation && L.Browser.any3d) {
      map.off("zoomanim", this._animateZoom, this);
    }

    this._canvas = null;
    this._ctx = null;
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  _initCanvas: function () {
    const canvas = (this._canvas = L.DomUtil.create(
      "canvas",
      "leaflet-heatmap-layer leaflet-layer"
    ));
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "400";

    const originProp = L.DomUtil.testProp([
      "transformOrigin",
      "WebkitTransformOrigin",
      "msTransformOrigin",
    ]);
    if (originProp) canvas.style[originProp] = "50% 50%";

    let size = { x: 100, y: 100 };
    if (this._map && typeof this._map.getSize === "function") {
      try {
        const mapSize = this._map.getSize();
        if (mapSize && mapSize.x > 0 && mapSize.y > 0) {
          size = mapSize;
        }
      } catch {
        // use fallback size
      }
    }

    canvas.width = Math.max(size.x, 100);
    canvas.height = Math.max(size.y, 100);

    const animated = this._map && this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));

    this._ctx = canvas.getContext("2d", { willReadFrequently: true });
  },

  _reset: function () {
    if (!this._map || !this._canvas) return;
    if (!this._map._loaded) return;
    try {
      if (!this._map.getPixelOrigin()) return;
    } catch {
      return;
    }

    const size = this._map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;

    try {
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);

      if (this._canvas.width !== size.x || this._canvas.height !== size.y) {
        this._canvas.width = size.x;
        this._canvas.height = size.y;
      }

      this._redraw();
    } catch {
      // Safe guard against mid-render detach
    }
  },

  _redraw: function () {
    if (!this._map || !this._canvas || !this._ctx) return;
    if (!this._map._loaded) return;
    try {
      if (!this._map.getPixelOrigin()) return;
    } catch {
      return;
    }

    this._frame = null;

    const size = this._map.getSize();
    if (!size || size.x <= 0 || size.y <= 0) return;
    const width = size.x;
    const height = size.y;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, width, height);

    if (!this._latlngs || this._latlngs.length === 0) return;

    const stamp = this._stamp;
    if (!stamp || !stamp.canvas) return;
    const r = stamp.r;
    const max = this.options.max || 8;
    const minOpacity = this.options.minOpacity !== undefined ? this.options.minOpacity : 0.25;

    // First Pass: Accumulate radial heat stamps onto canvas
    ctx.globalCompositeOperation = "source-over";

    for (let i = 0, len = this._latlngs.length; i < len; i++) {
      const p = this._latlngs[i];
      const lat = Array.isArray(p) ? p[0] : p.lat;
      const lng = Array.isArray(p) ? p[1] : p.lng;
      if (lat === undefined || lng === undefined) continue;

      try {
        const pt = this._map.latLngToContainerPoint([lat, lng]);
        if (!pt) continue;

        // Viewport culling with radial stamp margin
        if (pt.x < -r || pt.y < -r || pt.x > width + r || pt.y > height + r) {
          continue;
        }

        const weight = Array.isArray(p) && p[2] !== undefined ? p[2] : p.weight || 1;
        const intensity = Math.min(1.0, Math.max(minOpacity, weight / max));

        ctx.globalAlpha = intensity;
        ctx.drawImage(stamp.canvas, pt.x - r, pt.y - r);
      } catch {
        continue;
      }
    }

    // Second Pass: Colorize accumulated alpha values using the 256-step gradient
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;
      const palette = this._palette;

      for (let i = 0, len = pixels.length; i < len; i += 4) {
        const alpha = pixels[i + 3];
        if (alpha > 0) {
          const offset = alpha * 4;
          pixels[i] = palette[offset];         // R
          pixels[i + 1] = palette[offset + 1]; // G
          pixels[i + 2] = palette[offset + 2]; // B
          // Map accumulated alpha to a vibrant, luminous heat glow
          pixels[i + 3] = Math.min(240, Math.round(alpha * 0.85 + 50));
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Safe guard against zero width or detached canvas context
    }
  },

  _animateZoom: function (e) {
    if (!this._map || !this._canvas) return;
    try {
      const scale = this._map.getZoomScale(e.zoom);
      const offset = this._map
        ._getCenterOffset(e.center)
        ._multiplyBy(-scale)
        .subtract(this._map._getMapPanePos());

      if (L.DomUtil.setTransform) {
        L.DomUtil.setTransform(this._canvas, offset, scale);
      } else {
        this._canvas.style[L.DomUtil.TRANSFORM] =
          L.DomUtil.getTranslateString(offset) + " scale(" + scale + ")";
      }
    } catch {
      // Safe guard
    }
  },
});

export function createHeatLayer(latlngs, options) {
  return new HeatLayer(latlngs, options);
}

export default HeatLayer;
