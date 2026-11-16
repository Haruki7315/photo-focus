/**
 * Ask the device where it is (only when you tap "Use my location").
 * The browser shows its own permission prompt. Returns null if you say no,
 * if it's unavailable, or after 15 seconds.
 */
export function getCurrentLocation(): Promise<{ lat: number; lon: number } | { error: string }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ error: "This browser can't share your location." })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        resolve({
          error:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was turned off. You can allow it in Settings → Privacy → Location Services.'
              : "Couldn't find your location. Try again outside or pick a city.",
        }),
      // Low accuracy is plenty for sunrise times and saves battery.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60 * 60_000 },
    )
  })
}
