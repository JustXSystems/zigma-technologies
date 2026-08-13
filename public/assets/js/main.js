/**
 * Site-wide behaviour shared by every page.
 * Page-specific interactivity (forms, sliders, marquee, lightbox) lives in
 * assets/js/pages/<page>.js and is loaded only on the page that needs it.
 */
(function () {
  function initScrollReveal() {
    const revealEls = document.querySelectorAll(".reveal, .eyebrow-reveal");
    if (!revealEls.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  document.addEventListener("DOMContentLoaded", initScrollReveal);
})();
