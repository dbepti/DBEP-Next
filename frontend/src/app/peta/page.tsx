"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FilterStatus = "ALL" | "Y" | "N";
type Mode = "view" | "digitasi";

export default function PetaWK() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [hoveredWK, setHoveredWK] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allWK, setAllWK] = useState<any[]>([]);
  const [showCekungan, setShowCekungan] = useState(false);
  const [cekunganLoaded, setCekunganLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [digitasiCekungan, setDigitasiCekungan] = useState("");
  const [digitasiPoints, setDigitasiPoints] = useState<[number, number][]>([]);
  const [cekunganList, setCekunganList] = useState<any[]>([]);
  const digitasiRef = useRef<[number, number][]>([]);
  const markerLayerRef = useRef<any[]>([]);

  // Load WK data
  const loadWK = useCallback(async (map: any) => {
    const { data } = await sb
      .from("v_wk_spatial")
      .select("wkid,nama_wk,active_ind,luas_km2,geom")
      .not("geom", "is", null);
    if (!data) { setLoading(false); return; }
    setAllWK(data);
    setTotal(data.length);

    const features = data.map((w: any) => ({
      type: "Feature",
      properties: { wkid: w.wkid, nama_wk: w.nama_wk, active_ind: w.active_ind, luas_km2: w.luas_km2 },
      geometry: typeof w.geom === "string" ? JSON.parse(w.geom) : w.geom,
    }));

    map.addSource("wk", {
      type: "geojson",
      data: { type: "FeatureCollection", features } as any,
      cluster: true,
      clusterMaxZoom: 6,
      clusterRadius: 40,
    });

    // Cluster circle
    map.addLayer({
      id: "wk-cluster",
      type: "circle",
      source: "wk",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#1b5e20", 5, "#2e7d32", 10, "#388e3c"],
        "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 10, 28],
        "circle-opacity": 0.85,
        "circle-stroke-color": "#66bb6a",
        "circle-stroke-width": 1.5,
      },
    });

    // Cluster label count
    map.addLayer({
      id: "wk-cluster-count",
      type: "symbol",
      source: "wk",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Open Sans Bold"],
      },
      paint: { "text-color": "#a5d6a7" },
    });

    // Individual WK (unclustered)
    map.addLayer({ id: "wk-fill", type: "fill", source: "wk",
      filter: ["!", ["has", "point_count"]],
      paint: { "fill-color": ["case", ["==", ["get", "active_ind"], "Y"], "#1b5e20", "#424242"], "fill-opacity": 0.4 }
    });
    map.addLayer({ id: "wk-line", type: "line", source: "wk",
      filter: ["!", ["has", "point_count"]],
      paint: { "line-color": ["case", ["==", ["get", "active_ind"], "Y"], "#66bb6a", "#616161"], "line-width": 1 }
    });
    map.addLayer({ id: "wk-hl", type: "fill", source: "wk", paint: { "fill-color": "#2e7d32", "fill-opacity": 0.7 }, filter: ["==", ["get", "wkid"], ""] });

    // Klik cluster → zoom in
    map.on("click", "wk-cluster", (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["wk-cluster"] });
      const clusterId = features[0].properties.cluster_id;
      (map.getSource("wk") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
        if (err) return;
        map.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
      });
    });
    map.on("mouseenter", "wk-cluster", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "wk-cluster", () => { map.getCanvas().style.cursor = ""; });

    // Click
    map.on("click", "wk-fill", (e: any) => {
      if (mode === "digitasi") return;
      const p = e.features[0].properties;
      setSelected(p);
      map.setFilter("wk-hl", ["==", ["get", "wkid"], p.wkid]);
    });

    // Hover tooltip
    map.on("mousemove", "wk-fill", (e: any) => {
      if (mode === "digitasi") return;
      map.getCanvas().style.cursor = "pointer";
      const p = e.features[0].properties;
      setHoveredWK(p);
      setTooltipPos({ x: e.point.x, y: e.point.y });
    });
    map.on("mouseleave", "wk-fill", () => {
      map.getCanvas().style.cursor = "";
      setHoveredWK(null);
    });

    setLoading(false);
  }, [mode]);

  // Load cekungan
  const loadCekungan = useCallback(async (map: any) => {
    if (cekunganLoaded) return;
    const { data } = await sb.from("v_cekungan").select("cekungan_id,nama,luas_km2,klasifikasi_kode,geom,has_geom,lon,lat");
    if (!data) return;
    setCekunganList(data);

    // Polygon features (yang sudah didigitasi)
    const polyFeatures = data.filter((c: any) => c.geom).map((c: any) => ({
      type: "Feature",
      properties: { cekungan_id: c.cekungan_id, nama: c.nama, luas_km2: c.luas_km2, kode: c.klasifikasi_kode },
      geometry: typeof c.geom === "string" ? JSON.parse(c.geom) : c.geom,
    }));

    // Point features (semua cekungan dengan koordinat)
    const pointFeatures = data.filter((c: any) => c.lon && c.lat).map((c: any) => ({
      type: "Feature",
      properties: { cekungan_id: c.cekungan_id, nama: c.nama, luas_km2: c.luas_km2, kode: c.klasifikasi_kode, has_geom: c.has_geom },
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    }));

    if (!map.getSource("cekungan")) {
      map.addSource("cekungan", { type: "geojson", data: { type: "FeatureCollection", features: polyFeatures } as any });
      map.addSource("cekungan-pts", { type: "geojson", data: { type: "FeatureCollection", features: pointFeatures } as any });

      // Polygon layers (hanya yang sudah didigitasi)
      map.addLayer({ id: "cekungan-fill", type: "fill", source: "cekungan", paint: { "fill-color": "#e65100", "fill-opacity": 0.15 } }, "wk-fill");
      map.addLayer({ id: "cekungan-line", type: "line", source: "cekungan", paint: { "line-color": "#ff8a65", "line-width": 1.5, "line-dasharray": [3, 2] } }, "wk-fill");

      // Titik untuk cekungan yang belum didigitasi
      map.addLayer({ id: "cekungan-dot", type: "circle", source: "cekungan-pts",
        filter: ["==", ["get", "has_geom"], false],
        paint: { "circle-radius": 4, "circle-color": "#ff8a65", "circle-opacity": 0.7, "circle-stroke-color": "#bf360c", "circle-stroke-width": 1 }
      });

      // Label nama cekungan (hanya saat zoom >= 5)
      map.addLayer({ id: "cekungan-label", type: "symbol", source: "cekungan-pts",
        minzoom: 5,
        layout: {
          "text-field": ["get", "nama"],
          "text-size": 9,
          "text-anchor": "top",
          "text-offset": [0, 0.6],
          "text-allow-overlap": false,
        },
        paint: { "text-color": "#ff8a65", "text-halo-color": "#1a1a1a", "text-halo-width": 1.5 }
      });
    }
    setCekunganLoaded(true);
  }, [cekunganLoaded]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    import("maplibre-gl").then((ml) => {
      const map = new ml.Map({
        container: mapRef.current!,
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], tileSize: 256, attribution: "CARTO" } },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [118, -2], zoom: 4.5,
      });
      mapInstance.current = map;
      map.on("load", () => loadWK(map));
    });
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Filter WK
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.getLayer("wk-fill")) return;
    const filters: any[] = ["all"];
    if (filterStatus !== "ALL") filters.push(["==", ["get", "active_ind"], filterStatus]);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matched = allWK.filter(w => w.nama_wk?.toLowerCase().includes(q) || w.wkid?.toLowerCase().includes(q)).map(w => w.wkid);
      if (matched.length > 0) filters.push(["in", ["get", "wkid"], ["literal", matched]]);
      else filters.push(["==", ["get", "wkid"], ""]);
      setSearchResults(allWK.filter(w => w.nama_wk?.toLowerCase().includes(q) || w.wkid?.toLowerCase().includes(q)));
    } else {
      setSearchResults([]);
    }
    const filter = filters.length > 1 ? filters : null;
    map.setFilter("wk-fill", filter);
    map.setFilter("wk-line", filter);
  }, [filterStatus, search, allWK]);

  // Toggle cekungan
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const cekunganLayers = ["cekungan-fill","cekungan-line","cekungan-dot","cekungan-label"];
    if (showCekungan) {
      loadCekungan(map);
      cekunganLayers.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "visible"); });
    } else {
      cekunganLayers.forEach(l => { if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", "none"); });
    }
  }, [showCekungan]);

  // Digitasi mode
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    digitasiRef.current = digitasiPoints;

    if (mode === "digitasi") {
      map.getCanvas().style.cursor = "crosshair";

      const handleClick = (e: any) => {
        const { lng, lat } = e.lngLat;
        const newPts = [...digitasiRef.current, [lng, lat] as [number, number]];
        setDigitasiPoints(newPts);
        digitasiRef.current = newPts;

        // Gambar titik sebagai circle layer
        updateDigitasiLayer(map, newPts);
      };

      map.on("click", handleClick);
      (map as any)._digitasiHandler = handleClick;
    } else {
      map.getCanvas().style.cursor = "";
      const h = (map as any)._digitasiHandler;
      if (h) { map.off("click", h); delete (map as any)._digitasiHandler; }
    }
  }, [mode]);

  const updateDigitasiLayer = (map: any, pts: [number, number][]) => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        ...pts.map((p, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: { i } })),
        ...(pts.length >= 2 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: pts }, properties: {} }] : []),
      ]
    };
    if (map.getSource("digitasi-preview")) {
      (map.getSource("digitasi-preview") as any).setData(geojson);
    } else {
      map.addSource("digitasi-preview", { type: "geojson", data: geojson as any });
      map.addLayer({ id: "digitasi-line", type: "line", source: "digitasi-preview", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#ff8a65", "line-width": 2, "line-dasharray": [2, 1] } });
      map.addLayer({ id: "digitasi-pts", type: "circle", source: "digitasi-preview", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ff8a65", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
    }
  };

  const saveDigitasi = async () => {
    if (!digitasiCekungan || digitasiPoints.length < 3) return;
    const coords = [...digitasiPoints, digitasiPoints[0]]; // tutup polygon
    const wkt = `MULTIPOLYGON(((${coords.map(p => `${p[0]} ${p[1]}`).join(",")})))`;
    const { error } = await sb.rpc("update_cekungan_geom", { p_id: digitasiCekungan, p_wkt: wkt });
    if (!error) {
      alert(`✅ Geometri ${digitasiCekungan} berhasil disimpan!`);
      resetDigitasi();
      // Reload cekungan
      setCekunganLoaded(false);
      setShowCekungan(false);
      setTimeout(() => setShowCekungan(true), 100);
    } else {
      alert(`❌ Error: ${error.message}`);
    }
  };

  const resetDigitasi = () => {
    setDigitasiPoints([]);
    digitasiRef.current = [];
    const map = mapInstance.current;
    if (map?.getSource("digitasi-preview")) {
      (map.getSource("digitasi-preview") as any).setData({ type: "FeatureCollection", features: [] });
    }
  };

  const flyToWK = (wk: any) => {
    const map = mapInstance.current;
    if (!map) return;
    setSelected(wk);
    map.setFilter("wk-hl", ["==", ["get", "wkid"], wk.wkid]);
    // Fly to WK
    const features = (map.getSource("wk") as any)?._data?.features;
    const f = features?.find((ft: any) => ft.properties.wkid === wk.wkid);
    if (f) {
      import("maplibre-gl").then((ml) => {
        const bounds = new ml.LngLatBounds();
        const addCoords = (coords: any) => {
          if (Array.isArray(coords[0])) coords.forEach(addCoords);
          else bounds.extend(coords as [number, number]);
        };
        addCoords(f.geometry.coordinates);
        map.fitBounds(bounds, { padding: 80, maxZoom: 10 });
      });
    }
    setSearch("");
    setSearchResults([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#1a1a1a" }}>
      {/* Toolbar */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#212121" }}>
        <span style={{ fontSize: 14, color: "#e0e0e0", fontWeight: 500, marginRight: 4 }}>Peta WK</span>
        {!loading && <span style={{ fontSize: 11, color: "#555", marginRight: 8 }}>{total} WK</span>}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari WK..."
            style={{ background: "#2a2a2a", border: "1px solid #383838", borderRadius: 6, padding: "5px 10px", color: "#e0e0e0", fontSize: 12, width: 180, outline: "none" }}
          />
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, background: "#2a2a2a", border: "1px solid #383838", borderRadius: 6, zIndex: 100, width: 220, maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
              {searchResults.slice(0, 8).map(wk => (
                <div key={wk.wkid} onClick={() => flyToWK(wk)} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12, color: "#ccc", borderBottom: "1px solid #333" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ color: "#66bb6a", marginRight: 6 }}>{wk.wkid}</span>{wk.nama_wk}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter status */}
        {(["ALL","Y","N"] as FilterStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ background: filterStatus === s ? "#2e7d32" : "#2a2a2a", border: `1px solid ${filterStatus === s ? "#4caf50" : "#383838"}`, borderRadius: 5, padding: "4px 10px", color: filterStatus === s ? "#a5d6a7" : "#757575", fontSize: 11, cursor: "pointer" }}>
            {s === "ALL" ? "Semua" : s === "Y" ? "Aktif" : "Terminasi"}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: "#333", margin: "0 4px" }} />

        {/* Toggle cekungan */}
        <button onClick={() => setShowCekungan(v => !v)}
          style={{ background: showCekungan ? "#bf360c" : "#2a2a2a", border: `1px solid ${showCekungan ? "#ff8a65" : "#383838"}`, borderRadius: 5, padding: "4px 10px", color: showCekungan ? "#ffccbc" : "#757575", fontSize: 11, cursor: "pointer" }}>
          {showCekungan ? "✓ " : ""}Cekungan
        </button>

        {/* Digitasi mode */}
        <button onClick={() => { setMode(m => m === "digitasi" ? "view" : "digitasi"); resetDigitasi(); }}
          style={{ background: mode === "digitasi" ? "#1565c0" : "#2a2a2a", border: `1px solid ${mode === "digitasi" ? "#42a5f5" : "#383838"}`, borderRadius: 5, padding: "4px 10px", color: mode === "digitasi" ? "#bbdefb" : "#757575", fontSize: 11, cursor: "pointer" }}>
          {mode === "digitasi" ? "✏ Digitasi ON" : "✏ Digitasi"}
        </button>

        {/* Legend */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 11, color: "#555" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#66bb6a", borderRadius: 2, marginRight: 4 }} />Aktif</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#616161", borderRadius: 2, marginRight: 4 }} />Terminasi</span>
          {showCekungan && <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ff8a65", borderRadius: 2, marginRight: 4 }} />Cekungan</span>}
        </div>
      </div>

      {/* Digitasi panel */}
      {mode === "digitasi" && (
        <div style={{ padding: "8px 16px", background: "#1a2a3a", borderBottom: "1px solid #1e3a5f", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#42a5f5" }}>✏ Mode Digitasi Cekungan</span>
          <select value={digitasiCekungan} onChange={e => setDigitasiCekungan(e.target.value)}
            style={{ background: "#1e3a5f", border: "1px solid #1565c0", borderRadius: 5, padding: "4px 8px", color: "#e0e0e0", fontSize: 11, maxWidth: 250 }}>
            <option value="">-- Pilih Cekungan --</option>
            {cekunganList.filter(c => !c.has_geom).map(c => (
              <option key={c.cekungan_id} value={c.cekungan_id}>{c.nama}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "#42a5f5" }}>{digitasiPoints.length} titik</span>
          <button onClick={resetDigitasi} style={{ background: "#2a2a2a", border: "1px solid #555", borderRadius: 4, padding: "3px 8px", color: "#aaa", fontSize: 11, cursor: "pointer" }}>Reset</button>
          <button onClick={saveDigitasi} disabled={!digitasiCekungan || digitasiPoints.length < 3}
            style={{ background: digitasiCekungan && digitasiPoints.length >= 3 ? "#1565c0" : "#2a2a2a", border: "1px solid #1565c0", borderRadius: 4, padding: "3px 10px", color: "#bbdefb", fontSize: 11, cursor: "pointer" }}>
            Simpan
          </button>
          <span style={{ fontSize: 10, color: "#546e7a" }}>Klik pada peta untuk menambah titik. Min 3 titik untuk menyimpan.</span>
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" />
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Loading */}
        {loading && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#2a2a2a", borderRadius: 8, padding: "12px 20px", color: "#9e9e9e", fontSize: 13 }}>
            Memuat data WK...
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredWK && !selected && (
          <div style={{
            position: "absolute", left: tooltipPos.x + 12, top: tooltipPos.y - 10,
            background: "#212121", border: "1px solid #333", borderRadius: 6,
            padding: "6px 10px", fontSize: 11, color: "#ccc", pointerEvents: "none", zIndex: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
          }}>
            <div style={{ color: "#e0e0e0", fontWeight: 500, marginBottom: 2 }}>{hoveredWK.nama_wk}</div>
            <div style={{ color: hoveredWK.active_ind === "Y" ? "#66bb6a" : "#757575" }}>
              {hoveredWK.active_ind === "Y" ? "Aktif" : "Terminasi"}
            </div>
            {hoveredWK.luas_km2 && <div style={{ color: "#555" }}>{Number(hoveredWK.luas_km2).toLocaleString("id-ID")} km²</div>}
          </div>
        )}

        {/* Info panel */}
        {selected && (
          <div style={{ position: "absolute", top: 12, right: 12, background: "#2a2a2a", border: "1px solid #383838", borderRadius: 8, padding: 16, width: 240, zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 500 }}>{selected.nama_wk}</span>
              <button onClick={() => { setSelected(null); mapInstance.current?.setFilter("wk-hl", ["==", ["get", "wkid"], ""]); }}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: "#666", lineHeight: 2 }}>
              <div><span style={{ color: "#9e9e9e" }}>WKID: </span>{selected.wkid}</div>
              <div><span style={{ color: "#9e9e9e" }}>Status: </span>
                <span style={{ color: selected.active_ind === "Y" ? "#66bb6a" : "#757575" }}>
                  {selected.active_ind === "Y" ? "● Aktif" : "● Terminasi"}
                </span>
              </div>
              {selected.luas_km2 && <div><span style={{ color: "#9e9e9e" }}>Luas: </span>{Number(selected.luas_km2).toLocaleString("id-ID")} km²</div>}
            </div>
            <a href={`/wk/${selected.wkid}`}
              style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "#66bb6a", textDecoration: "none", background: "#1b3a1f", padding: "4px 10px", borderRadius: 4 }}>
              Lihat detail WK →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
