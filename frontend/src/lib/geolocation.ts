export type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export type GeolocationErrorKind = 'unsupported' | 'permission_denied' | 'position_unavailable' | 'timeout' | 'unknown';

export class GeolocationCaptureError extends Error {
  kind: GeolocationErrorKind;
  constructor(kind: GeolocationErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/**
 * Wraps the browser Geolocation API with the specific error handling this
 * app needs — every failure mode surfaces its own clear reason rather than a
 * generic "something went wrong". Never fabricates a location: on any
 * failure the promise rejects, it does not resolve with a fallback.
 */
export function captureLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(
        new GeolocationCaptureError(
          'unsupported',
          'This browser or device does not support location services, so stock cannot be accepted here.',
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new GeolocationCaptureError(
                'permission_denied',
                'Location permission was denied. Stock acceptance requires your location — please allow access and try again.',
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(
              new GeolocationCaptureError(
                'position_unavailable',
                'Your location could not be determined right now. Please try again.',
              ),
            );
            break;
          case error.TIMEOUT:
            reject(
              new GeolocationCaptureError('timeout', 'Getting your location took too long. Please try again.'),
            );
            break;
          default:
            reject(
              new GeolocationCaptureError(
                'unknown',
                'An unexpected error occurred while getting your location. Please try again.',
              ),
            );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/**
 * Best-effort reverse geocode via OpenStreetMap Nominatim (free, no API key).
 * Latitude/longitude remain the source of truth — this never throws, it
 * simply returns null on any failure so the UI can fall back to showing
 * coordinates alone.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'display_name' in data && typeof data.display_name === 'string') {
      return data.display_name;
    }
    return null;
  } catch {
    return null;
  }
}
