/** Contact page: request-type pre-fill + contact form submit (demo, front-end only). */
document.addEventListener('DOMContentLoaded', () => {
  // ===== Pre-fill subject dropdown when a "request type" card is clicked =====
    document.querySelectorAll('.feat-link[data-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subject = btn.getAttribute('data-subject');
        const select = document.getElementById('cfSubject');
        if (select) {
          [...select.options].forEach(opt => {
            if (opt.value === subject || opt.textContent.trim() === subject) select.value = opt.value || opt.textContent.trim();
          });
        }
        document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // ===== Contact form submit (front-end only demo) =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        contactForm.style.display = 'none';
        document.getElementById('cfSuccess').style.display = 'block';
      });
    }
});
