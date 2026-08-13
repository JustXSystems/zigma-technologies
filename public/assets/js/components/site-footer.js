/**
 * <site-footer current="home|careers|certifications|contact" quote-href="#contact">
 *
 * Single source of truth for the footer, the WhatsApp float button and the
 * sticky mobile call-to-action bar — all three appear at the bottom of every page.
 * `quote-href` lets each page point "Get Quote" wherever makes sense for it.
 */
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.current = this.getAttribute("current") || "home";
    this.quoteHref = this.getAttribute("quote-href") || "contact.html#contact-form";
    this.quoteLabel = this.getAttribute("quote-label") || "Get Quote";
    this.render();
  }

  link(href, label, extra = "") {
    return `<a href="${href}"${extra}>${label}</a>`;
  }

  render() {
    const p = (name) => (this.current === "home" ? `#${name}` : `index.html#${name}`);
    const careersHref = "careers.html";

    this.innerHTML = `
      <footer>
        <div class="container">
          <div class="foot-grid">
            <div>
              <a href="${this.current === "home" ? "#home" : "index.html"}" class="logo footer-logo mb-1">
                <span class="logo-chip"><img src="assets/images/zigma-technologies-logo.png" alt="Zigma Technologies"></span>
                <span class="logo-word">Zigma Technologies<small>POWER &amp; ENERGY ENGINEERING</small></span>
              </a>
              <p class="footer-tagline">Engineering power infrastructure for Indian industry since 2006 — Solar EPC, Industrial UPS, Battery Solutions, and 24×7 AMC.</p>
              <form class="newsletter-form" id="newsletterForm">
                <input type="email" placeholder="Your email" aria-label="Email for newsletter" required>
                <button type="submit">Subscribe</button>
              </form>
            </div>
            <div>
              <h6>Company</h6>
              ${this.link(p("why"), "About Zigma")}
              ${this.link(p("legacy"), "20-Year Legacy")}
              ${this.link(careersHref, "Careers")}
              ${this.link("#", "Insights")}
              ${this.link("#", "Sitemap")}
              ${this.link("#", "Blog")}
            </div>
            <div>
              <h6>Capabilities</h6>
              ${this.link(p("generate"), "Solar Solutions")}
              ${this.link(p("protect"), "UPS Solutions")}
              ${this.link(p("bess"), "BESS - Battery Systems")}
              ${this.link(p("ev-charging"), "EV Charging Stations")}
              ${this.link(p("maintain"), "AMC - O&amp;M Supports")}
              ${this.link(p("engineering-design"), "Design &amp; Engineering")}
            </div>
            <div>
              <h6>Contact</h6>
              ${this.link("tel:+919590137444", "+91 95901 37444")}
              ${this.link("mailto:info@zigma-technologies.com", "info@zigma-technologies.com")}
              ${this.link("tel:+919590137666", "Emergency Call: +91 9590137666 →", ' class="foot-emergency"')}
              <div class="social-links">
                <a href="#" class="sl-fb" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg></a>
                <a href="#" class="sl-ig" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg></a>
                <a href="#" class="sl-li" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.94-1.79-2.94-1.8 0-2.08 1.4-2.08 2.85V21H9z"/></svg></a>
                <a href="#" class="sl-x" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 3H21l-6.55 7.49L22 21h-6.19l-4.85-6.34L5.36 21H2.6l7.02-8.02L2 3h6.34l4.38 5.8L18.24 3zm-1.08 16.17h1.53L7.9 4.74H6.26l10.9 14.43z"/></svg></a>
                <a href="#" class="sl-yt" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 6.2a2.8 2.8 0 00-1.97-2C18.9 3.7 12 3.7 12 3.7s-6.9 0-8.53.5A2.8 2.8 0 001.5 6.2 29.3 29.3 0 001 12a29.3 29.3 0 00.5 5.8 2.8 2.8 0 001.97 2c1.63.5 8.53.5 8.53.5s6.9 0 8.53-.5a2.8 2.8 0 001.97-2A29.3 29.3 0 0023 12a29.3 29.3 0 00-.5-5.8zM9.8 15.5v-7l6 3.5z"/></svg></a>
              </div>
            </div>
          </div>
          <div class="foot-bottom">
            <span>© 2026 Zigma Technologies. All rights reserved.</span>
            <span class="foot-powered">Powered by <a href="https://www.justxsystems.com/" target="_blank" rel="noopener noreferrer"><strong>JustX Systems</strong></a></span>
            <span class="foot-legal"><a href="#">Privacy Policy</a><a href="#">Terms</a></span>
          </div>
        </div>
      </footer>

      <a href="https://wa.me/919590137444" target="_blank" rel="noopener noreferrer" class="float-wa" aria-label="Chat on WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z"/></svg>
      </a>

      <div class="sticky-mobile-cta">
        <a href="tel:+919590137444" class="call">Call Now</a>
        <a href="${this.quoteHref}" class="quote">${this.quoteLabel}</a>
      </div>
    `;

    const form = this.querySelector("#newsletterForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.innerHTML = `<span style="color:var(--green);font-size:0.85rem;">Thanks — you're subscribed!</span>`;
    });
  }
}

customElements.define("site-footer", SiteFooter);
