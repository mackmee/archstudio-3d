export interface LightingState {
  timeOfDay: number; // 5.5 to 23.5
  formattedTime: string; // e.g. "18:45"
  periodName: 'sunrise' | 'noon' | 'sunset' | 'night';
  sunPos: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  skyTurbidity: number;
  skyRayleigh: number;
  skyMieCoefficient: number;
  skyMieDirectionalG: number;
  skySunPosition: [number, number, number];
  interiorLightIntensity: number;
  contactShadowOpacity: number;
  bgColor: string;
  isNight: boolean;
}

/**
 * Formats decimal hours (e.g. 18.75) to "18:45"
 */
export function formatTimeOfDay(hour: number): string {
  const clamped = Math.max(0, Math.min(24, hour));
  const h = Math.floor(clamped);
  const m = Math.round((clamped - h) * 60);
  const hStr = h.toString().padStart(2, '0');
  const mStr = (m === 60 ? 0 : m).toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

/**
 * Computes smooth architectural ArchViz lighting parameters for any time of day
 */
export function calculateLighting(time: number): LightingState {
  const t = Math.max(5.5, Math.min(23.5, time));
  const formattedTime = formatTimeOfDay(t);

  // Period classification
  let periodName: 'sunrise' | 'noon' | 'sunset' | 'night';
  if (t < 7.5) {
    periodName = 'sunrise';
  } else if (t < 17.0) {
    periodName = 'noon';
  } else if (t < 19.8) {
    periodName = 'sunset';
  } else {
    periodName = 'night';
  }

  const isNight = t >= 19.8;

  // 1. SUN ARC TRAJECTORY
  // East is -X, West is +X. South is +Z. Height is +Y.
  let sunPos: [number, number, number];
  let skySunPosition: [number, number, number];
  let sunColor = '#fffdf5';
  let sunIntensity = 1.45;
  let ambientColor = '#f8fafc';
  let ambientIntensity = 0.55;
  let hemiSky = '#e0f2fe';
  let hemiGround = '#334155';
  let hemiIntensity = 0.45;
  let skyTurbidity = 3;
  let skyRayleigh = 1.0;
  let skyMieCoefficient = 0.005;
  const skyMieDirectionalG = 0.8;
  let interiorLightIntensity = 0.0;
  let contactShadowOpacity = 0.65;
  let bgColor = '#080c15';

  if (t < 7.5) {
    // === SUNRISE (05:30 - 07:30) ===
    const prog = (t - 5.5) / 2.0; // 0 to 1
    const x = -20 + prog * 8; // -20 to -12
    const y = 2.0 + prog * 10; // 2 to 12
    const z = 10 + prog * 2;
    sunPos = [x, y, z];
    skySunPosition = [x * 5, y * 5, z * 5];

    sunColor = '#fb923c'; // Warm peach/gold
    sunIntensity = 0.9 + prog * 0.55;
    ambientColor = '#fed7aa';
    ambientIntensity = 0.35 + prog * 0.15;
    hemiSky = '#f97316';
    hemiGround = '#1e1b4b';
    hemiIntensity = 0.45;
    skyTurbidity = 10;
    skyRayleigh = 3.5 - prog * 1.5;
    skyMieCoefficient = 0.05;
    interiorLightIntensity = Math.max(0, 0.7 - prog * 0.7);
    contactShadowOpacity = 0.6;
    bgColor = '#0f172a';
  } else if (t < 17.0) {
    // === NOON / CRISP DAYLIGHT (07:30 - 17:00) ===
    const prog = (t - 7.5) / 9.5; // 0 to 1
    // Sun arcs from east to zenith to west
    const x = -12 + prog * 24; // -12 to +12
    const y = 12 + Math.sin(prog * Math.PI) * 12; // 12 to 24 to 12
    const z = 12 + Math.sin(prog * Math.PI) * 4;
    sunPos = [x, y, z];
    skySunPosition = [x * 5, y * 5, z * 5];

    sunColor = '#fffdf5';
    sunIntensity = 1.45;
    ambientColor = '#f8fafc';
    ambientIntensity = 0.6;
    hemiSky = '#bae6fd';
    hemiGround = '#334155';
    hemiIntensity = 0.5;
    skyTurbidity = 2.5;
    skyRayleigh = 0.6;
    skyMieCoefficient = 0.005;
    interiorLightIntensity = 0.0;
    contactShadowOpacity = 0.7;
    bgColor = '#080c15';
  } else if (t < 19.8) {
    // === SUNSET / GOLDEN HOUR (17:00 - 19:48) ===
    const prog = (t - 17.0) / 2.8; // 0 to 1
    const x = 12 + prog * 8; // 12 to 20
    const y = 12 - prog * 10.5; // 12 down to 1.5
    const z = 12 - prog * 2;
    sunPos = [x, y, z];
    skySunPosition = [x * 5, Math.max(0.5, y * 5), z * 5];

    sunColor = '#ea580c'; // Deep sunset amber
    sunIntensity = 1.7 - prog * 0.6;
    ambientColor = '#fed7aa';
    ambientIntensity = 0.45 - prog * 0.15;
    hemiSky = '#ea580c';
    hemiGround = '#1e1b4b';
    hemiIntensity = 0.55;
    skyTurbidity = 10;
    skyRayleigh = 2.5 + prog * 2.0;
    skyMieCoefficient = 0.08;
    interiorLightIntensity = 0.2 + prog * 1.5; // Warm chandeliers fade on!
    contactShadowOpacity = 0.55;
    bgColor = '#0d1117';
  } else {
    // === NIGHT / MIDNIGHT (19:48 - 23:30) ===
    // Directional light becomes cool silvery-blue moonlight
    sunPos = [10, 18, -10];
    skySunPosition = [0, -100, 0]; // Sun far below horizon
    sunColor = '#93c5fd';
    sunIntensity = 0.28;
    ambientColor = '#1e1b4b';
    ambientIntensity = 0.18;
    hemiSky = '#312e81';
    hemiGround = '#020617';
    hemiIntensity = 0.22;
    skyTurbidity = 1.0;
    skyRayleigh = 0.1;
    skyMieCoefficient = 0.001;
    interiorLightIntensity = 2.2; // Full cozy 3000K chandeliers in every room!
    contactShadowOpacity = 0.35;
    bgColor = '#030712';
  }

  return {
    timeOfDay: t,
    formattedTime,
    periodName,
    sunPos,
    sunColor,
    sunIntensity,
    ambientColor,
    ambientIntensity,
    hemiSky,
    hemiGround,
    hemiIntensity,
    skyTurbidity,
    skyRayleigh,
    skyMieCoefficient,
    skyMieDirectionalG,
    skySunPosition,
    interiorLightIntensity,
    contactShadowOpacity,
    bgColor,
    isNight,
  };
}
