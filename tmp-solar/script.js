  // Counters
  const counters = document.querySelectorAll('.num[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const plusEl = el.querySelector('.plus');
        const duration = 1400;
        const start = performance.now();
        el.textContent = '';
        const txt = document.createTextNode('0');
        el.appendChild(txt);
        if (plusEl) el.appendChild(plusEl);
        function tick(now){
          const p = Math.min((now - start) / duration, 1);
          txt.nodeValue = Math.floor(p * target);
          if (p < 1) requestAnimationFrame(tick); else txt.nodeValue = target;
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObserver.observe(c));

  // Scroll reveal (staggered within groups)
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        const siblings = Array.from(entry.target.parentElement.children).filter(c => c.classList.contains('reveal'));
        entry.target.style.transitionDelay = (siblings.indexOf(entry.target) * 90) + 'ms';
        entry.target.classList.add('is-visible');
        const tgt = entry.target; setTimeout(() => { tgt.style.transitionDelay = ''; }, 1000);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Animated process line + O&M chart
  [['stepsRow', 0.3], ['omCard', 0.3]].forEach(([id, t]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const o = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in-view'); o.unobserve(e.target); } });
    }, { threshold: t });
    o.observe(el);
  });

  // Marquee: duplicate pills for a seamless loop
  document.querySelectorAll('.marquee-track').forEach(track => {
    Array.from(track.children).forEach(c => track.appendChild(c.cloneNode(true)));
  });

  // Charts: animate when scrolled into view
  const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in-view'); chartObserver.unobserve(e.target); } });
  }, { threshold: 0.3 });
  document.querySelectorAll('.anim-on-view').forEach(el => chartObserver.observe(el));

  // ---------- ROI popup calculator ----------
  (function(){
    const modal = document.getElementById('roiModal'), openBtn = document.getElementById('roiOpen');
    if (!modal || !openBtn) return;
    const $ = id => document.getElementById(id);
    const fmt = n => {
      const a = Math.abs(n), s = n < 0 ? '-' : '';
      if (a >= 1e7) return s + 'â‚¹' + (a/1e7).toFixed(2) + ' Cr';
      if (a >= 1e5) return s + 'â‚¹' + (a/1e5).toFixed(2) + ' L';
      return s + 'â‚¹' + Math.round(a).toLocaleString('en-IN');
    };
    let lastFocus = null;
    function open(){ lastFocus = document.activeElement; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; setTimeout(()=>$('m_bill').focus(), 50); }
    function close(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; if (lastFocus) lastFocus.focus(); }
    function calc(){
      const bill = parseFloat($('m_bill').value), tariff = parseFloat($('m_tariff').value);
      const err = $('m_error'), box = $('m_results');
      if (!(bill > 0) || !(tariff > 0)) { err.textContent = 'Please enter a monthly bill and tariff greater than zero.'; box.classList.remove('show'); return; }
      err.textContent = '';
      const offset=0.8, cost=45000, yld=4.2, esc=0.03, deg=0.007, omPct=0.01;
      const kw = Math.max((bill/tariff*offset)/(yld*30.4), 0.1);
      const capex = kw*cost, gen1 = kw*yld*365, omCost = capex*omPct;
      let cum = -capex, prev = cum, pb = null;
      for (let y=1; y<=25; y++){
        cum += gen1*Math.pow(1-deg,y-1)*tariff*Math.pow(1+esc,y-1) - omCost;
        if (pb === null && cum >= 0) pb = (y-1) + (-prev)/(cum-prev);
        prev = cum;
      }
      $('m_size').textContent = kw.toFixed(1) + ' kW';
      $('m_capex').textContent = fmt(capex);
      $('m_payback').textContent = pb === null ? '25+ yrs' : pb.toFixed(1) + ' yrs';
      $('m_net').textContent = fmt(cum);
      $('m_sum').textContent = 'Roughly ' + fmt(gen1*tariff - omCost) + ' saved in year 1, and about ' + (gen1*0.82/1000).toFixed(1) + ' tonnes of COâ‚‚ avoided every year.';
      box.classList.add('show');
    }
    openBtn.addEventListener('click', open);
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
    $('m_calc').addEventListener('click', calc);
    [$('m_bill'), $('m_tariff')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') calc(); }));
  })();


  // End-to-end: loop highlight (AMC) and stepper (inverters)
  (function(){
    const fig=document.getElementById('loopFig');
    if (fig){
      const nodes=fig.querySelectorAll('.node'), items=document.querySelectorAll('.loop-list li');
      let cur=0, timer;
      const set=i=>{cur=i;nodes.forEach((n,k)=>n.classList.toggle('active',k===i));items.forEach((n,k)=>n.classList.toggle('active',k===i));};
      const stop=()=>clearInterval(timer), start=()=>{stop();timer=setInterval(()=>set((cur+1)%nodes.length),2600);};
      items.forEach((li,k)=>{li.addEventListener('mouseenter',()=>{stop();set(k);});li.addEventListener('mouseleave',start);});
      nodes.forEach((n,k)=>{n.addEventListener('mouseenter',()=>{stop();set(k);});n.addEventListener('mouseleave',start);});
      set(0); start();
    }
    const te=document.getElementById('te');
    if (te){
      const tabs=te.querySelectorAll('.te-tab'), panels=te.querySelectorAll('.te-panel');
      let cur=0, timer;
      const set=i=>{cur=i;tabs.forEach((b,k)=>{b.classList.toggle('active',k===i);b.classList.toggle('done',k<i);b.setAttribute('aria-selected',k===i);});panels.forEach((p,k)=>p.classList.toggle('active',k===i));te.style.setProperty('--p',i/(tabs.length-1));};
      const stop=()=>clearInterval(timer), start=()=>{stop();timer=setInterval(()=>set((cur+1)%tabs.length),4800);};
      tabs.forEach((b,k)=>b.addEventListener('click',()=>{set(k);start();}));
      te.addEventListener('mouseenter',stop); te.addEventListener('mouseleave',start);
      set(0); start();
    }
  })();

  // Solar system types accordion
  (function(){
    const acc=document.getElementById('tyAcc'); if(!acc) return;
    const items=acc.querySelectorAll('.ty-item'), imgs=document.querySelectorAll('#tyVisual .ty-img');
    const capN=document.getElementById('tyCapN'), capT=document.getElementById('tyCapT');
    function show(i){
      imgs.forEach((im,k)=>im.classList.toggle('on',k===i));
      capN.textContent=String(i+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
      capT.innerHTML=items[i].querySelector('.ty-title').innerHTML;
    }
    items.forEach((it,i)=>{
      const btn=it.querySelector('.ty-head');
      btn.addEventListener('click',()=>{
        const isOpen=it.classList.contains('open');
        items.forEach(o=>{o.classList.remove('open');o.querySelector('.ty-head').setAttribute('aria-expanded','false');});
        if(!isOpen){it.classList.add('open');btn.setAttribute('aria-expanded','true');show(i);}
      });
    });
  })();

  // Hero slider (3 slides)
  (function(){
    const hero=document.getElementById('top'); if(!hero) return;
    const bgs=hero.querySelectorAll('.hero-bg'), copies=hero.querySelectorAll('.hero-copy'), dots=hero.querySelectorAll('.hero-dot');
    let cur=0, timer;
    function go(i){
      cur=(i+bgs.length)%bgs.length;
      bgs.forEach((b,k)=>b.classList.toggle('on',k===cur));
      copies.forEach((c,k)=>c.classList.toggle('on',k===cur));
      dots.forEach((d,k)=>{d.classList.remove('on'); if(k===cur){void d.offsetWidth; d.classList.add('on');} d.setAttribute('aria-current',k===cur?'true':'false');});
    }
    const stop=()=>clearInterval(timer), start=()=>{stop();timer=setInterval(()=>go(cur+1),6500);};
    dots.forEach((d,k)=>d.addEventListener('click',()=>{go(k);start();}));
    go(0); start();
  })();
</script>

</body>
</html>
