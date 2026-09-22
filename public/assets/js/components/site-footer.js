/**
 * <site-footer> — static HTML demos only.
 * Link columns load from Admin → Navigation → Footer via /api/public/nav.
 * No hardcoded Company / Capabilities / Contact lists.
 */
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.current = this.getAttribute('current') || 'home';
    this.quoteHref = this.getAttribute('quote-href') || 'contact.html#contact-form';
    this.quoteLabel = this.getAttribute('quote-label') || 'Get Quote';
    this.columns = [];
    this.render();
    this.loadColumns();
  }

  async loadColumns() {
    try {
      const res = await fetch('/api/public/nav?location=footer&format=columns');
      const data = await res.json();
      this.columns = Array.isArray(data?.columns) ? data.columns : [];
    } catch {
      this.columns = [];
    }
    this.render();
  }

  renderColumns() {
    if (!this.columns.length) {
      return '';
    }
    return this.columns
      .map((col) => {
        const links = (col.links || [])
          .map((link) => {
            const cls = link.className ? ` class="${link.className}"` : '';
            return `<a href="${link.href || '#'}"${cls}>${link.label || ''}</a>`;
          })
          .join('');
        return `<div class="foot-col"><h6>${col.heading || ''}</h6>${links}</div>`;
      })
      .join('');
  }

  render() {
    this.innerHTML = `
      <footer>
        <div class="container">
          <div class="foot-grid">
            <div class="foot-brand">
              <a href="${this.current === 'home' ? '#home' : 'index.html'}" class="logo footer-logo mb-1">
                <span class="logo-chip"><img src="assets/images/zigma-technologies-logo.png" alt="Zigma Technologies"></span>
                <span class="logo-word">Zigma Technologies<small>POWER &amp; ENERGY ENGINEERING</small></span>
              </a>
            </div>
            ${this.renderColumns()}
          </div>
          <div class="foot-bottom">
            <span>© 2026 Zigma Technologies. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <a href="https://wa.me/919590137444" target="_blank" rel="noopener noreferrer" class="float-wa" aria-label="Chat on WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z"/></svg>
      </a>

      <div class="sticky-mobile-cta">
        <a href="tel:+919590137444" class="call">Call</a>
        <a href="https://wa.me/919590137444" class="wa" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href="${this.quoteHref}" class="quote">${this.quoteLabel}</a>
      </div>
    `;
  }
}

customElements.define('site-footer', SiteFooter);
