/** Home page: hero slider, animated counters, testimonial carousel, legacy timeline runner. */
document.addEventListener('DOMContentLoaded', () => {
  // ===== HERO SLIDER =====
    const slides = document.querySelectorAll('.hero-slider .slide');
    const dots = document.querySelectorAll('#dotNav button');
    let current = 0;
    let heroTimer;

    function goToSlide(i){
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      dots[current].querySelector('.fill').classList.remove('run');
      dots[current].querySelector('.fill').style.width = '0';

      current = (i + slides.length) % slides.length;

      slides[current].classList.add('active');
      dots[current].classList.add('active');
      const fillEl = dots[current].querySelector('.fill');
      fillEl.style.width = '0';
      void fillEl.offsetWidth; // reflow to restart animation
      fillEl.classList.add('run');
    }

    function nextSlide(){ goToSlide(current + 1); }
    function resetTimer(){ clearInterval(heroTimer); heroTimer = setInterval(nextSlide, 6000); }

    dots.forEach((d,i) => d.addEventListener('click', () => { goToSlide(i); resetTimer(); }));
    resetTimer();

    // Animated counters (hero intro + stat bar)
    const counters = document.querySelectorAll('.num[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const plusEl = el.querySelector('.plus');
          const duration = 1400;
          const start = performance.now();
          function tick(now){
            const progress = Math.min((now - start) / duration, 1);
            const current = Math.floor(progress * target);
            el.childNodes[0].nodeValue = current;
            if (progress < 1) requestAnimationFrame(tick);
            else el.childNodes[0].nodeValue = target;
          }
          el.textContent = '';
          if (plusEl) el.appendChild(plusEl);
          el.insertBefore(document.createTextNode('0'), el.firstChild);
          requestAnimationFrame(tick);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));

    // Testimonial carousel
    const testiSlides = document.querySelectorAll('.testi-slide');
    const testiDots = document.querySelectorAll('.testi-dots button');
    let activeTesti = 0;
    function showTesti(i){
      testiSlides.forEach((s, idx) => s.classList.toggle('active', idx === i));
      testiDots.forEach((d, idx) => d.classList.toggle('active', idx === i));
      activeTesti = i;
    }
    testiDots.forEach((d, i) => d.addEventListener('click', () => showTesti(i)));
    setInterval(() => showTesti((activeTesti + 1) % testiSlides.length), 6000);
    // ===== TIMELINE RUNNER (20-Years of Legacy) =====
    const timelineScroller = document.querySelector('.timeline-scroller');
    const timelineRunner = document.getElementById('timelineRunner');
    if (timelineScroller && timelineRunner) {
      const stopItems = Array.from(timelineScroller.querySelectorAll('.timeline-item:not(.next-item)'));
      let tlRunning = false;

      function tlWait(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      function tlPositionFor(item){
        const dot = item.querySelector('.timeline-dot');
        const dotRect = dot.getBoundingClientRect();
        const scrollerRect = timelineScroller.getBoundingClientRect();
        return {
          left: dotRect.left - scrollerRect.left + timelineScroller.scrollLeft + dotRect.width / 2 - timelineRunner.offsetWidth / 2,
          top: dotRect.top - scrollerRect.top + dotRect.height / 2 - timelineRunner.offsetHeight / 2
        };
      }

      function tlPlaceRunner(item, instant){
        const pos = tlPositionFor(item);
        if (instant) timelineRunner.style.transition = 'none';
        timelineRunner.style.left = pos.left + 'px';
        timelineRunner.style.top = pos.top + 'px';
        if (instant) {
          void timelineRunner.offsetWidth; // force reflow before re-enabling transition
          timelineRunner.style.transition = '';
        }
      }

      function tlClearHighlight(){
        stopItems.forEach(it => it.classList.remove('tl-active'));
      }

      async function tlRun(){
        if (tlRunning) return;
        tlRunning = true;

        tlPlaceRunner(stopItems[0], true);
        timelineRunner.style.opacity = '1';
        await tlWait(700);

        while (true) {
          for (let i = 0; i < stopItems.length; i++){
            const item = stopItems[i];
            tlPlaceRunner(item, false);
            await tlWait(950);
            tlClearHighlight();
            item.classList.add('tl-active');
            await tlWait(950);
          }
          // Reached "Today" — dissolve here instead of sliding back, then restart from 2006
          tlClearHighlight();
          timelineRunner.style.opacity = '0';
          await tlWait(450);
          tlPlaceRunner(stopItems[0], true);
          await tlWait(150);
          timelineRunner.style.opacity = '1';
        }
      }

      const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tlRun();
            timelineObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      timelineObserver.observe(timelineScroller);

      window.addEventListener('resize', () => {
        const active = stopItems.find(it => it.classList.contains('tl-active')) || stopItems[0];
        tlPlaceRunner(active, true);
      });
    }
});
