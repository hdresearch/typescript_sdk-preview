/**
 * Converts an HTTP(S) URL to a WebSocket Secure (WSS) URL and appends /ephemeral
 * @param {string} baseURL - The base HTTP(S) URL to convert
 * @returns {string} The converted WSS URL with /ephemeral appended
 * @example
 * getWSSUrl('https://api.hdr.is/compute') // Returns 'wss://api.hdr.is/compute/ephemeral'
 */
export function getWSSUrl(baseURL: string): string {
  const url = new URL(baseURL);
  // Replace http(s) protocol with wss
  url.protocol = 'wss:';
  // Ensure path doesn't end with slash before adding ephemeral
  url.pathname = url.pathname.replace(/\/$/, '') + '/ephemeral';
  return url.toString();
}

/**
 * Constructs a stream URL by combining the base URL and machine ID
 * @param {string} baseURL - The base URL of the API
 * @param {string} machineId - The ID of the machine to stream from
 * @returns {string} The complete stream URL
 * @example
 * getStreamUrl('https://api.hdr.is', '123abc') // Returns 'https://api.hdr.is/compute/123abc/stream'
 */
export function getStreamUrl(baseURL: string, machineId: string): string {
  return `${baseURL}/compute/${machineId}/stream`;
}
