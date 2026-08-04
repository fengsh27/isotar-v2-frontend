// Clipboard access with a non-secure-context fallback.
//
// `navigator.clipboard` is only exposed in secure contexts (HTTPS, or
// localhost). isoTar is commonly served over plain HTTP on an internal host
// (see docker-compose: 9501:3000), where the async Clipboard API is simply
// absent — so the modern path alone would always fail there. The
// `document.execCommand("copy")` fallback is deprecated but remains the only
// thing that works over HTTP in current browsers.

function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Keep it out of view and prevent the page from scrolling to it on focus.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/** Copy `text` to the clipboard. Resolves to false when every path failed. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or non-secure context — fall through.
    }
  }

  return copyViaExecCommand(text);
}
