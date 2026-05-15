import { Ionicons } from '@expo/vector-icons';
import React, { createElement } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fontWeights, radius, spacing } from '../constants/theme';

// ─── Glacier Ridge Metro Park – Marsh Hawk Loop ───────────────────────────────
// Source: AllTrails GPX export (Marsh_Hawk_Loop.gpx) — 454 points downsampled to 77
// Park address: 9801 Hyland-Croy Rd, Plain City, OH 43064
const PARK_CENTER = { lat: 40.1558, lng: -83.1961 };

const MARSH_HAWK_TRAIL: [number, number][] = [
  [40.15452, -83.19604],
  [40.15419, -83.19535],
  [40.15378, -83.19522],
  [40.15314, -83.19519],
  [40.15239, -83.19518],
  [40.15208, -83.1952],
  [40.15183, -83.19498],
  [40.15185, -83.19471],
  [40.15225, -83.19407],
  [40.15235, -83.19362],
  [40.15244, -83.19298],
  [40.15253, -83.19239],
  [40.1526, -83.19199],
  [40.15265, -83.19161],
  [40.15268, -83.19121],
  [40.15297, -83.1903],
  [40.15339, -83.18966],
  [40.15371, -83.18967],
  [40.15408, -83.18929],
  [40.15421, -83.18918],
  [40.15471, -83.18941],
  [40.15495, -83.18993],
  [40.15532, -83.19049],
  [40.15573, -83.191],
  [40.1564, -83.19128],
  [40.15733, -83.19146],
  [40.15814, -83.19128],
  [40.15859, -83.19123],
  [40.15941, -83.19108],
  [40.15973, -83.1911],
  [40.16007, -83.19144],
  [40.16028, -83.19197],
  [40.16054, -83.19282],
  [40.16037, -83.1935],
  [40.16014, -83.19446],
  [40.16017, -83.19483],
  [40.16019, -83.19525],
  [40.16014, -83.19564],
  [40.1601, -83.1962],
  [40.16002, -83.19665],
  [40.15995, -83.19707],
  [40.15992, -83.19739],
  [40.15989, -83.19827],
  [40.15985, -83.19876],
  [40.15973, -83.19936],
  [40.15985, -83.19997],
  [40.16001, -83.20088],
  [40.15982, -83.20132],
  [40.15929, -83.20188],
  [40.15866, -83.20201],
  [40.15832, -83.20209],
  [40.15771, -83.20215],
  [40.15722, -83.20208],
  [40.15686, -83.20174],
  [40.15658, -83.20125],
  [40.15608, -83.20069],
  [40.15559, -83.20042],
  [40.15563, -83.19989],
  [40.15548, -83.19943],
  [40.15515, -83.19944],
  [40.15483, -83.1995],
  [40.15432, -83.19943],
  [40.1535, -83.19895],
  [40.15274, -83.19855],
  [40.15207, -83.19777],
  [40.15162, -83.19724],
  [40.15108, -83.19674],
  [40.15104, -83.19621],
  [40.15125, -83.19545],
  [40.15149, -83.19513],
  [40.15187, -83.19507],
  [40.15224, -83.19522],
  [40.15283, -83.19514],
  [40.15344, -83.19521],
  [40.15401, -83.19528],
  [40.15436, -83.1956],
  [40.15452, -83.19604], // Closes the loop back to start
];

// ─── HTML Map Content ─────────────────────────────────────────────────────────
function buildMapHTML(trail: [number, number][], center: { lat: number; lng: number }): string {
  const trailJSON = JSON.stringify(trail);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Park Trail Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; }

    /* Info card */
    #info-card {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 14px 18px 20px;
      z-index: 1000;
      border-top: 1px solid rgba(59, 130, 246, 0.4);
    }
    #info-card h2 {
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin-bottom: 2px;
    }
    #info-card .subtitle {
      color: rgba(255,255,255,0.6);
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin-bottom: 10px;
    }
    .stat-row {
      display: flex;
      gap: 10px;
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 999px;
      padding: 4px 10px;
      color: #93c5fd;
      font-size: 11px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .stat-pill.green {
      background: rgba(34, 197, 94, 0.2);
      border-color: rgba(34, 197, 94, 0.4);
      color: #86efac;
    }

    /* GPS status banner */
    #gps-banner {
      position: absolute;
      top: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(59, 130, 246, 0.5);
      border-radius: 999px;
      padding: 6px 14px;
      color: #93c5fd;
      font-size: 11px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 1001;
      white-space: nowrap;
    }

    /* Pulsing start marker */
    @keyframes pulse {
      0%   { transform: scale(1);   opacity: 1; }
      70%  { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(1);   opacity: 0; }
    }
    .start-marker-outer {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(34, 197, 94, 0.3);
      display: flex; align-items: center; justify-content: center;
      animation: pulse 2s ease-out infinite;
    }
    .start-marker-inner {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #fff;
    }

    /* User location dot */
    @keyframes userPulse {
      0%   { transform: scale(1);   opacity: 0.8; }
      50%  { transform: scale(1.6); opacity: 0.2; }
      100% { transform: scale(1);   opacity: 0.8; }
    }
    .user-dot-ring {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.25);
      display: flex; align-items: center; justify-content: center;
      animation: userPulse 1.8s ease-in-out infinite;
    }
    .user-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #3b82f6;
      border: 2.5px solid #fff;
      box-shadow: 0 0 6px rgba(59,130,246,0.8);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="gps-banner">📡 Requesting GPS…</div>
  <div id="info-card">
    <h2>🥾 Marsh Hawk Trail</h2>
    <div class="subtitle">Glacier Ridge Metro Park · Plain City, OH</div>
    <div class="stat-row">
      <div class="stat-pill">📏 ~3.7 miles</div>
      <div class="stat-pill green">✅ Paved · ADA Accessible</div>
      <div class="stat-pill">🔁 Loop</div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const TRAIL = ${trailJSON};
    const CENTER = [${center.lat}, ${center.lng}];

    // Init map
    const map = L.map('map', {
      center: CENTER,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark-ish OpenStreetMap tiles (Stadia Alidade Smooth Dark – free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Trail polyline
    const trailLine = L.polyline(TRAIL, {
      color: '#22c55e',
      weight: 6,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Decorative dashed border on trail for depth
    L.polyline(TRAIL, {
      color: '#fff',
      weight: 10,
      opacity: 0.15,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    trailLine.bringToFront();

    // Start / End marker (pulsing green)
    const startIcon = L.divIcon({
      className: '',
      html: '<div class="start-marker-outer"><div class="start-marker-inner"></div></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    L.marker(TRAIL[0], { icon: startIcon })
      .addTo(map)
      .bindPopup('<b>🏁 Start / Finish</b><br>Parking lot at Glacier Ridge', { closeButton: false });

    map.fitBounds(trailLine.getBounds(), { padding: [30, 30] });

    // ── GPS Tracking ────────────────────────────────────────────────────────
    let userMarker = null;
    const gpsBanner = document.getElementById('gps-banner');

    const userIcon = L.divIcon({
      className: '',
      html: '<div class="user-dot-ring"><div class="user-dot"></div></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          gpsBanner.textContent = '📍 GPS active · ' + Math.round(accuracy) + 'm accuracy';
          gpsBanner.style.borderColor = 'rgba(34,197,94,0.6)';
          gpsBanner.style.color = '#86efac';

          if (!userMarker) {
            userMarker = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(map)
              .bindPopup('<b>You are here</b>', { closeButton: false });
          } else {
            userMarker.setLatLng([latitude, longitude]);
          }
        },
        (err) => {
          if (err.code === 1) {
            gpsBanner.textContent = '🚫 Location access denied';
            gpsBanner.style.borderColor = 'rgba(239,68,68,0.5)';
            gpsBanner.style.color = '#fca5a5';
          } else {
            gpsBanner.textContent = '⚠️ GPS unavailable';
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } else {
      gpsBanner.textContent = '⚠️ GPS not supported in this browser';
    }
  </script>
</body>
</html>
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ParkMapModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ParkMapModal({ visible, onClose }: ParkMapModalProps) {
  const insets = useSafeAreaInsets();
  const mapHTML = buildMapHTML(MARSH_HAWK_TRAIL, PARK_CENTER);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : spacing.md }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="map" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Park Trail Map</Text>
            <Text style={styles.headerSub}>Glacier Ridge Metro Park</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={onClose}
          accessibilityLabel="Close map"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Map — iframe works on all browsers; srcdoc inlines the HTML; allow="geolocation" enables GPS */}
      <View style={styles.mapContainer}>
        {createElement('iframe', {
          srcDoc: mapHTML,
          style: {
            flex: 1,
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#0f172a',
          },
          allow: 'geolocation',
          title: 'Marsh Hawk Trail Map',
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.25)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    // Height must be explicit for iframe to fill correctly on web
    minHeight: 400,
  },
});
