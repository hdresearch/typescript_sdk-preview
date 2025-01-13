export function getWSSUrl(baseURL: string) {
  const url = new URL(baseURL);
  // Replace http(s) protocol with wss
  url.protocol = 'wss:';
  // Ensure path doesn't end with slash before adding ephemeral
  url.pathname = url.pathname.replace(/\/$/, '') + '/ephemeral';
  return url.toString();
}

export function getStreamUrl(baseURL: string, machineId: string) {
  return `${baseURL}/compute/${machineId}/stream`;
}
