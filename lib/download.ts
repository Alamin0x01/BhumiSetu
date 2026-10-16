/** Saves text as a file in the browser. Nothing is sent anywhere. */
export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType: string,
) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked after the click has been handled; the temporary URL is not reused.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
