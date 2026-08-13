/**
 * <site-header current="home|careers|certifications|contact">
 *
 * Single source of truth for the site's header/navigation, used on every page.
 * - `current` attribute controls the active nav-link highlight and rewrites
 *   in-page anchors (e.g. "#why") so they still resolve correctly from any page.
 * - Handles the header scroll state, mega-menu (desktop) and drawer (mobile) behaviour.
 */
class SiteHeader extends HTMLElement {
  static get observedAttributes() {
    return ["current"];
  }

  connectedCallback() {
    this.current = this.getAttribute("current") || "home";
    this.render();
    this.bindEvents();
  }

  // Nav destinations are declared once as { label, target, sub } and resolved
  // per-page below — this is the "avoid duplication" bit: add a link here once
  // and every page picks it up.
  static get NAV_ITEMS() {
    return [
      {
        label: "Who We Are",
        anchor: "why",
        mega: [
          { heading: "About Us", links: [
            { label: "About Zigma", anchor: "why" },
            { label: "20+ Years Legacy", anchor: "legacy" },
          ]},
          { heading: "Standards", links: [
            { label: "Certifications", href: "certifications.html" },
            { label: "Quality &amp; Safety", href: "#" },
          ]},
          { heading: "Company", links: [
            { label: "Life at Zigma", href: "careers.html#life-at-zigma" },
            { label: "Our Facilities", href: "#" },
          ]},
        ],
      },
      {
        label: "What We Do",
        anchor: "generate",
        megaClass: "mega-2x2",
        mega: [
          { heading: "Generate", links: [
            { label: "Solar EPC Solutions", anchor: "generate" },
            { label: "Solar AMC - O&amp;M", anchor: "generate" },
            { label: "Solar Inverters", anchor: "generate" },
          ]},
          { heading: "Protect", links: [
            { label: "UPS Solutions", anchor: "protect" },
            { label: "UPS AMC Services", anchor: "protect" },
            { label: "All Power Solution", anchor: "protect" },
          ]},
          { heading: "BESS", links: [
            { label: "Utility-Scale BESS", anchor: "bess" },
            { label: "Peak Shaving &amp; EMS", anchor: "bess" },
            { label: "Hybrid Solar + BESS", anchor: "bess" },
          ]},
          { heading: "Maintain", links: [
            { label: "Energy Auditing", anchor: "maintain" },
            { label: "Industrial Electronics", anchor: "maintain" },
            { label: "Technical Consultation", anchor: "maintain" },
          ]},
          { heading: "EV Charging", links: [
            { label: "All EV - Infrastructure", anchor: "ev-charging" },
            { label: "Smart Charging Solutions", anchor: "ev-charging" },
            { label: "Solar + BESS + EV", anchor: "ev-charging" },
          ]},
          { heading: "Engineering", links: [
            { label: "Design &amp; Development", anchor: "engineering-design" },
            { label: "Electrical Engineering", anchor: "experts" },
            { label: "Project Support", anchor: "engineering-design" },
          ]},
        ],
      },
      { label: "Industries", href: "industries.html" },
      { label: "Projects", anchor: "projects" },
      { label: "Products", href: "#" },
      { label: "Innovation", href: "#" },
      { label: "Contact", href: "contact.html#contact-form" },
    ];
  }

  // Resolves a link relative to the current page: same-page anchors on the
  // home page stay as "#id"; from any other page they become "index.html#id".
  resolveHref(item) {
    if (item.href) return item.href;
    if (item.anchor) {
      return this.current === "home" ? `#${item.anchor}` : `index.html#${item.anchor}`;
    }
    return "#";
  }

  renderMegaCol(col) {
    const links = col.links
      .map((l) => `<a href="${this.resolveHref(l)}">${l.label}</a>`)
      .join("\n");
    return `<div class="mega-col"><h5>${col.heading}</h5>${links}</div>`;
  }

  renderNavItem(item) {
    const isCurrentPage =
      (item.href === "industries.html" && this.current === "industries") ||
      (item.href && item.href.startsWith("contact.html") && this.current === "contact");
    const current = isCurrentPage ? ' aria-current="page"' : "";

    if (item.mega) {
      const cols = item.mega.map((c) => this.renderMegaCol(c)).join("\n");
      return `
        <li>
          <a href="${this.resolveHref(item)}">${item.label} <span class="caret">▾</span></a>
          <div class="mega ${item.megaClass || ""}">${cols}</div>
        </li>`;
    }
    return `<li><a href="${this.resolveHref(item)}"${current}>${item.label}</a></li>`;
  }

  render() {
    const homeHref = this.current === "home" ? "#home" : "index.html";
    const requestConsultHref = this.current === "contact" ? "#contact-form" : "contact.html#contact-form";
    const navItems = SiteHeader.NAV_ITEMS.map((i) => this.renderNavItem(i)).join("\n");

    this.innerHTML = `
      <a class="skip-link" href="#main-content">Skip to content</a>
      <header id="siteHeader">
        <div class="container nav-wrap">
          <a href="${homeHref}" class="logo">
            <span class="logo-chip"><img src="assets/images/zigma-technologies-logo.png" alt="Zigma Technologies logo"></span>
            <span class="logo-word">Zigma Technologies<small>POWER &amp; ENERGY ENGINEERING</small></span>
          </a>
          <nav class="primary-nav">
            <ul class="nav-links">
              ${navItems}
            </ul>
          </nav>
          <div class="header-right">
            <a href="${requestConsultHref}" class="btn btn-primary btn-sm">Request Consultation</a>
            <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button>
          </div>
        </div>
      </header>`;
  }

  bindEvents() {
    const header = this.querySelector("#siteHeader");
    const toggle = this.querySelector(".menu-toggle");
    const navLinks = this.querySelector(".nav-links");

    // Header scroll state (adds subtle elevation/backdrop once the page scrolls)
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Mobile drawer open/close
    toggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      toggle.classList.toggle("is-active", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "✕" : "☰";
      document.body.classList.toggle("nav-open", isOpen);
    });

    // Mobile: tapping a mega-menu parent expands its submenu instead of navigating
    navLinks.querySelectorAll("li").forEach((li) => {
      const mega = li.querySelector(".mega");
      if (!mega) return;
      const link = li.querySelector("a");
      link.addEventListener("click", (e) => {
        if (window.innerWidth > 760) return;
        e.preventDefault();
        li.classList.toggle("nav-item-open");
      });
    });

    // Close the drawer whenever a real navigation link is tapped
    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        if (window.innerWidth > 760) return;
        if (a.parentElement.querySelector(".mega")) return;
        navLinks.classList.remove("is-open");
        toggle.classList.remove("is-active");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
        document.body.classList.remove("nav-open");
      });
    });
  }
}

customElements.define("site-header", SiteHeader);
