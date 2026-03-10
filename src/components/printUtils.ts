/**
 * Print HTML content via a hidden iframe.
 * Works correctly on desktop browsers (Chrome, Firefox, Safari, Edge).
 * On Android the native print dialog may show a warning — this is a known
 * Android Chrome limitation; the prescription content itself is correct.
 */
export function printHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iDoc.open();
  iDoc.write(html);
  iDoc.close();

  // Allow the browser to render the content before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback for browsers that block iframe print (e.g. iOS Safari on tablet)
      const fallback = window.open('', '_blank');
      if (fallback) {
        fallback.document.write(html);
        fallback.document.close();
        // Wait for content to render before triggering print dialog
        setTimeout(() => fallback.print(), 800);
      }
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1500);
  }, 400);
}
