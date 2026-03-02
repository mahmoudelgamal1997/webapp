/**
 * printHtml — cross-platform print utility (desktop + Android/iOS mobile)
 *
 * WHY this approach:
 *   - window.open('', '_blank')  → blocked by Android popup blocker
 *   - iframe.contentWindow.print() → not supported on Android Chrome
 *   - window.print() on the MAIN window → the ONLY option that works on Android
 *
 * HOW it works:
 *   1. Inject the receipt/report HTML as a hidden div (#__pw_frame__) into the
 *      current page's body.
 *   2. Add a <style> that, only during @media print, hides #root and shows
 *      #__pw_frame__. On screen nothing changes — the user sees the React app
 *      normally throughout.
 *   3. Call window.print() on the main window — Android's native print/share
 *      sheet opens and renders only the injected content.
 *   4. Clean up all injected nodes after the print dialog closes.
 */
export function printHtml(html: string): void {
  // Pull body content and all <style> blocks out of the full HTML string
  const headContent = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const bodyContent = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html)
    // Never execute any injected scripts
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // 1. Isolation styles: during print, hide the React app and show our frame
  const isoStyle = document.createElement('style');
  isoStyle.id = '__pw_iso__';
  isoStyle.textContent = `
    @media print {
      #root { display: none !important; }
      #__pw_frame__ { display: block !important; }
    }
    @media screen {
      #__pw_frame__ { display: none !important; }
    }
  `;
  document.head.appendChild(isoStyle);

  // 2. Inject the original receipt/report CSS so it renders correctly
  const contentStyle = document.createElement('style');
  contentStyle.id = '__pw_css__';
  const styleBlocks = headContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? [];
  contentStyle.textContent = styleBlocks
    .map(block => block.replace(/<\/?style[^>]*>/gi, ''))
    .join('\n');
  document.head.appendChild(contentStyle);

  // 3. Inject the print content (hidden on screen)
  const frame = document.createElement('div');
  frame.id = '__pw_frame__';
  frame.innerHTML = bodyContent;
  document.body.appendChild(frame);

  const cleanup = () => {
    document.getElementById('__pw_iso__')?.remove();
    document.getElementById('__pw_css__')?.remove();
    document.getElementById('__pw_frame__')?.remove();
  };

  // afterprint fires reliably on desktop and modern Android (Chrome 47+)
  window.addEventListener('afterprint', cleanup, { once: true });

  // Small delay so the browser processes the DOM before opening the print dialog
  setTimeout(() => {
    window.print();
    // Safety net: clean up if afterprint never fires (very old Android WebView)
    setTimeout(cleanup, 5000);
  }, 200);
}
