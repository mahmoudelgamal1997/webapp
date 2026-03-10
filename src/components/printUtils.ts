/**
 * Print HTML content via a hidden iframe.
 * Works correctly on desktop browsers (Chrome, Firefox, Safari, Edge).
 *
 * On Android (including Samsung tablets) the iframe approach is unreliable:
 * some devices silently print the parent document instead of the iframe content.
 * For Android we skip the iframe entirely and open a new tab to print from there.
 */
export function printHtml(html: string): void {
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => {
        popup.print();
        // Give the print dialog time to open before closing the tab
        setTimeout(() => {
          try { popup.close(); } catch { /* ignored */ }
        }, 2000);
      }, 400);
    }
    return;
  }

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
        setTimeout(() => fallback.print(), 800);
      }
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1500);
  }, 400);
}
