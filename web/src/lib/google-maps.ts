/**
 * Loads the Google Maps script once, only on pages that show a map. The key is a browser key,
 * locked in Google Cloud to this site's addresses. If Google refuses it (a billing or key
 * problem), listeners hear about it so the page can fall back to "use my location".
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const mapsConfigured = Boolean(KEY);

let loading: Promise<void> | null = null;
let refused = false;
const onRefuse = new Set<() => void>();

export function loadGoogleMaps(): Promise<void> {
  if (!KEY) return Promise.reject(new Error("No Google Maps key"));
  if (refused) return Promise.reject(new Error("Google Maps refused the key"));
  loading ??= new Promise<void>((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.__emMapsReady = () => resolve();
    // Google calls this global when the key is wrong, restricted, or the project can't use Maps
    w.gm_authFailure = () => {
      refused = true;
      onRefuse.forEach((f) => f());
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&callback=__emMapsReady`;
    s.async = true;
    s.onerror = () => {
      loading = null; // a dropped connection can try again on the next visit
      reject(new Error("Google Maps didn't load"));
    };
    document.head.append(s);
  });
  return loading;
}

export function whenMapsRefused(f: () => void) {
  onRefuse.add(f);
  return () => void onRefuse.delete(f);
}
