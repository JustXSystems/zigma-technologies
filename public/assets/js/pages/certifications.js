/** Certifications page: click-to-enlarge lightbox for certificate cards. */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('lightboxOverlay');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxClose');

  document.querySelectorAll('.cert-card').forEach(card => {
    card.addEventListener('click', () => {
      lightboxImg.src = card.getAttribute('data-img');
      lightboxCaption.textContent = card.getAttribute('data-name');
      overlay.classList.add('active');
    });
  });

  function closeLightbox(){ overlay.classList.remove('active'); }
  overlay.addEventListener('click', closeLightbox);
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  document.querySelector('.lightbox-content').addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
});
