/** Careers page: application form pre-fill + submit (demo, front-end only). */
document.addEventListener('DOMContentLoaded', () => {
  // ===== Pre-fill role dropdown when "Apply Now" is clicked on a job card or the internship card =====
    document.querySelectorAll('[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-role');
        const select = document.getElementById('apRole');
        if (select) {
          [...select.options].forEach(opt => {
            if (opt.value === role || opt.textContent.trim() === role) select.value = opt.value || opt.textContent.trim();
          });
        }
        document.getElementById('apply').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // ===== Application form submit (front-end only demo) =====
    const applyForm = document.getElementById('applyForm');
    if (applyForm) {
      applyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        applyForm.style.display = 'none';
        document.getElementById('apSuccess').style.display = 'block';
      });
    }
});
