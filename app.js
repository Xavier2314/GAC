/* Goal Achievers · Senior Managers' Retreat
   Motion: GSAP + ScrollTrigger + Lenis when available. Every section stays
   readable without them (no-JS, reduced motion, or a library failing to load). */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGsap && !reduce;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  if (!animate) doc.classList.add('no-anim');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scroll ---------------- */
  var lenis = null;
  if (animate && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function stopScroll() { if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden'; }
  function startScroll() { if (lenis) lenis.start(); else document.body.style.overflow = ''; }
  function scrollToEl(el, immediate) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -84, immediate: !!immediate, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: immediate || reduce ? 'auto' : 'smooth' });
  }
  function scrollTop() { if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); }

  /* ---------------- Text splitting ---------------- */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (node) {
      var isEm = node.nodeType === 1;
      var text = node.textContent;
      var host = el;
      if (isEm) { host = document.createElement(node.tagName.toLowerCase()); el.appendChild(host); }
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { host.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'w';
        var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
        w.appendChild(wi); host.appendChild(w);
      });
    });
  }
  function splitLetters(el) {
    var text = el.textContent; el.textContent = '';
    el.setAttribute('aria-label', text.charAt(0) + text.slice(1).toLowerCase());
    text.split('').forEach(function (ch) {
      var s = document.createElement('span'); s.className = 'l'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch; el.appendChild(s);
    });
  }
  if (animate) {
    $$('[data-split]').forEach(splitWords);
    $$('[data-letters]').forEach(splitLetters);
  }

  /* ---------------- Loader + hero intro ---------------- */
  var loader = $('#loader');
  if (animate) {
    gsap.set('.hero .ht-serif .wi', { yPercent: 115 });
    gsap.set('.ht-big .l', { yPercent: 110, rotate: 6 });
    gsap.set('#heroOrb', { scale: 0.6, opacity: 0, rotate: -40 });
    gsap.set('[data-hero]', { y: 30, opacity: 0 });
    gsap.set('.site-head', { y: -30, opacity: 0 });
    gsap.set('.scroll-cue', { opacity: 0 });
  }
  function heroIntro() {
    if (!animate) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero .ht-serif .wi', { yPercent: 0, duration: 1.3, stagger: 0.08 })
      .to('.ht-big .l', { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.05 }, '-=1.05')
      .to('#heroOrb', { scale: 1, opacity: 1, rotate: 0, duration: 1.8, clearProps: 'transform' }, '-=1.4')
      .to('[data-hero]', { y: 0, opacity: 1, duration: 1.1, stagger: 0.1 }, '-=1.3')
      .to('.site-head', { y: 0, opacity: 1, duration: 1, clearProps: 'transform' }, '-=1.1')
      .to('.scroll-cue', { opacity: 1, duration: 1 }, '-=0.6');
  }
  function hideLoader() {
    if (!loader || loader.dataset.gone) return;
    loader.dataset.gone = '1';
    if (!animate) { loader.remove(); return; }
    gsap.timeline({ onComplete: function () { loader.remove(); } })
      .to('.loader-inner', { y: -24, opacity: 0, duration: 0.6, ease: 'power3.in' })
      .to(loader, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.15')
      .add(heroIntro, '-=0.55');
  }
  if (loader) {
    if (!animate) { loader.remove(); }
    else {
      var started = Date.now();
      var go = function () { setTimeout(hideLoader, Math.max(0, 1150 - (Date.now() - started))); };
      if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
      setTimeout(hideLoader, 3500);
    }
  }

  /* ---------------- Scroll reveals ---------------- */
  function setupReveals(scope) {
    if (!animate) return;
    $$('[data-split]', scope).forEach(function (el) {
      if (el.closest('.hero') || el.dataset.revealed) return;
      el.dataset.revealed = '1';
      gsap.from($$('.wi', el), { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    var items = $$('[data-reveal]', scope).filter(function (el) { return !el.dataset.revealed; });
    items.forEach(function (el) { el.dataset.revealed = '1'; });
    if (!items.length) return;
    gsap.set(items, { y: 46, opacity: 0 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.09, overwrite: true }); }
    });
  }

  function setupScenes() {
    if (!animate) return;
    // hero drifts away as you scroll
    gsap.to('.hero-grid', { yPercent: 14, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    // count-up
    $$('[data-count]').forEach(function (el) {
      var target = +el.dataset.count, obj = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(obj, { v: target, duration: 2, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('en-NG'); } });
      } });
    });
    // Abeokuta landscape parallax
    $$('.city [data-depth]').forEach(function (layer) {
      var d = parseFloat(layer.dataset.depth);
      gsap.fromTo(layer, { yPercent: d * 40 }, { yPercent: -d * 30, ease: 'none', scrollTrigger: { trigger: '.city', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.sun', { scale: 0.85 }, { scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.city', start: 'top bottom', end: 'bottom top', scrub: true } });
    // payment timeline grows
    var steps = $('#steps');
    if (steps) {
      steps.style.setProperty('--grow', '0');
      gsap.to(steps, { '--grow': 1, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 75%', end: 'bottom 60%', scrub: true } });
    }
  }

  /* ---------------- Take-home list highlight ---------------- */
  (function () {
    var list = $$('#takeList li');
    if (!list.length || !('IntersectionObserver' in window) || reduce) { list.forEach(function (li) { li.classList.add('on'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('on'); else if (e.boundingClientRect.top > 0) e.target.classList.remove('on'); });
    }, { rootMargin: '0px 0px -45% 0px', threshold: 0 });
    list.forEach(function (li) { io.observe(li); });
  })();

  /* ---------------- Header, progress, marquee speed ---------------- */
  var head = $('#siteHead'), bar = $('#progressBar'), lastY = 0, menuOpen = false;
  var marquee = $('#marqueeTrack'), marqueeAnim = null, boost = 0;
  function onScroll(y, velocity) {
    head.classList.toggle('scrolled', y > 30);
    if (!menuOpen) head.classList.toggle('hide', y > 640 && y > lastY + 2);
    if (y < lastY - 2) head.classList.remove('hide');
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (marqueeAnim && velocity !== undefined) boost = Math.min(4, Math.abs(velocity) / 6);
  }
  if (marquee && marquee.getAnimations && !reduce) {
    marqueeAnim = marquee.getAnimations()[0] || null;
    (function decay() {
      if (marqueeAnim) { boost *= 0.92; marqueeAnim.playbackRate = 1 + boost; }
      requestAnimationFrame(decay);
    })();
  }
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll, e.velocity); });
  else window.addEventListener('scroll', function () { onScroll(window.scrollY, 0); }, { passive: true });
  onScroll(window.scrollY);

  /* ---------------- Embers (hero canvas) ---------------- */
  (function () {
    var canvas = $('#embers');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, parts = [], stars = [], running = true, visible = true;
    var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
    var sc = sprite.getContext('2d'), g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(247,210,120,.85)'); g.addColorStop(1, 'rgba(229,169,48,0)');
    sc.fillStyle = g; sc.fillRect(0, 0, 64, 64);
    function resize() {
      var r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(110, W / 13));
      parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
    }
    function make(anyY) {
      return { x: Math.random() * W, y: anyY ? Math.random() * H : H + 20, r: 0.6 + Math.random() * 2.4, vy: 0.15 + Math.random() * 0.55, a: Math.random() * Math.PI * 2, s: 0.004 + Math.random() * 0.012, tw: Math.random() * Math.PI * 2 };
    }
    function shoot() {
      if (!running) return;
      stars.push({ x: W * (0.1 + Math.random() * 0.5), y: H * Math.random() * 0.35, vx: 7 + Math.random() * 4, vy: 2.4 + Math.random() * 1.6, life: 1 });
    }
    function frame() {
      if (running && visible) {
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          p.y -= p.vy; p.a += p.s; p.tw += 0.03; p.x += Math.sin(p.a) * 0.35;
          if (p.y < -20) parts[i] = make(false);
          var alpha = 0.35 + Math.sin(p.tw) * 0.3, size = p.r * 7;
          ctx.globalAlpha = Math.max(0.05, alpha) * Math.min(1, (H - p.y) / 160 + 0.2);
          ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        }
        for (var j = stars.length - 1; j >= 0; j--) {
          var s = stars[j]; s.x += s.vx; s.y += s.vy; s.life -= 0.014;
          if (s.life <= 0) { stars.splice(j, 1); continue; }
          var grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 18, s.y - s.vy * 18);
          grad.addColorStop(0, 'rgba(255,240,200,' + s.life + ')'); grad.addColorStop(1, 'rgba(229,169,48,0)');
          ctx.globalAlpha = 1; ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 18, s.y - s.vy * 18); ctx.stroke();
          ctx.drawImage(sprite, s.x - 10, s.y - 10, 20, 20);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize(); frame();
    window.addEventListener('resize', resize);
    if (!reduce) { setTimeout(shoot, 2600); setInterval(shoot, 6500); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    document.addEventListener('visibilitychange', function () { running = !document.hidden; });
  })();

  /* ---------------- Pointer niceties ---------------- */
  if (finePointer && !reduce) {
    var cursor = $('#cursor'), cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; cursor.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('on'); });
    (function loop() { cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18; cursor.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', function (e) { cursor.classList.toggle('big', !!e.target.closest('a,button,.drop,.card')); });

    $$('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });

    $$('.spot').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    function tilt(area, target, max) {
      if (!area || !target) return;
      area.addEventListener('mousemove', function (e) {
        var r = area.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        target.style.transform = 'rotateY(' + x * max + 'deg) rotateX(' + -y * max + 'deg)';
      });
      area.addEventListener('mouseleave', function () { target.style.transform = ''; });
      target.style.transition = 'transform .8s cubic-bezier(.22,1,.36,1)';
    }
    tilt($('.hero'), $('#heroOrb'), 18);
    tilt($('#bankCard'), $('#bankCard'), 10);
  }

  /* ---------------- Views (Event / Contact) ---------------- */
  var views = ['event', 'contact'];
  var curtain = $('#curtain');
  var current = null;
  function swapView(name) {
    $$('[data-view]').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== name; });
    $$('[data-link]').forEach(function (a) { if (a.getAttribute('data-link') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = name === 'contact' ? 'Contact · Goal Achievers' : "Senior Managers' Retreat · Goal Achievers";
    current = name;
    scrollTop();
    if (animate) { setupReveals($('[data-view="' + name + '"]')); ScrollTrigger.refresh(); }
  }
  function route(first) {
    var h = location.hash.replace('#', '');
    var name = views.indexOf(h) > -1 ? h : 'event';
    var soon = { home: 'Home', about: 'About Us' }[h];
    var target = (views.indexOf(h) === -1 && h && !soon) ? document.getElementById(h) : null;
    closeMenu();
    if (name === current) { if (soon) openSoon(soon); return; }
    if (first || !animate || !curtain) {
      swapView(name);
      if (target) setTimeout(function () { scrollToEl(target, true); }, 60);
    } else {
      gsap.timeline()
        .set(curtain, { transformOrigin: 'bottom' })
        .to(curtain, { scaleY: 1, duration: 0.6, ease: 'expo.inOut' })
        .add(function () { swapView(name); })
        .set(curtain, { transformOrigin: 'top' })
        .to(curtain, { scaleY: 0, duration: 0.7, ease: 'expo.inOut' }, '+=0.05');
    }
    if (soon) openSoon(soon);
  }
  window.addEventListener('hashchange', function () { route(false); });

  $$('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      closeMenu();
      if (current !== 'event') { location.hash = 'event'; setTimeout(function () { scrollToEl(t); }, 900); }
      else scrollToEl(t);
    });
  });

  /* ---------------- Mobile menu ---------------- */
  var menuBtn = $('#menuBtn'), mobileMenu = $('#mobileMenu');
  function openMenu() {
    menuOpen = true; mobileMenu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Close menu');
    head.classList.remove('hide'); stopScroll();
    if (animate) {
      gsap.fromTo(mobileMenu, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: 0.9, ease: 'expo.inOut' });
      gsap.fromTo('.mm-nav > *', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05, delay: 0.25 });
      gsap.fromTo('.mm-foot', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.5 });
    }
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    if (modal.hidden) startScroll();
    if (animate) gsap.to(mobileMenu, { clipPath: 'circle(0% at 100% 0%)', duration: 0.6, ease: 'expo.inOut', onComplete: function () { mobileMenu.hidden = true; } });
    else mobileMenu.hidden = true;
  }
  menuBtn.addEventListener('click', function () { if (menuOpen) closeMenu(); else openMenu(); });

  /* ---------------- Coming soon modal ---------------- */
  var modal = $('#soonModal'), lastFocus = null;
  function openSoon(page) {
    lastFocus = document.activeElement;
    $('#soonPage').textContent = page;
    closeMenu();
    modal.hidden = false; stopScroll();
    $('#soonOk').focus();
  }
  function closeSoon() { modal.hidden = true; startScroll(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $$('[data-soon]').forEach(function (b) { b.addEventListener('click', function () { openSoon(b.getAttribute('data-soon')); }); });
  $('#soonClose').addEventListener('click', closeSoon);
  $('#soonOk').addEventListener('click', closeSoon);
  $('#soonEvent').addEventListener('click', function () { modal.hidden = true; startScroll(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeSoon(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeSoon(); else if (menuOpen) closeMenu();
  });

  /* ---------------- Countdown ---------------- */
  var start = new Date('2026-11-20T00:00:00+01:00').getTime();
  var end = new Date('2026-11-24T00:00:00+01:00').getTime();
  var cd = $('#countdown');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var now = Date.now(), diff = start - now;
    if (diff <= 0) { cd.hidden = true; $('#countLabel').textContent = now < end ? 'Happening now in Abeokuta' : 'Thank you for joining us'; return; }
    $('[data-u="d"]', cd).textContent = Math.floor(diff / 864e5);
    $('[data-u="h"]', cd).textContent = pad(Math.floor(diff % 864e5 / 36e5));
    $('[data-u="m"]', cd).textContent = pad(Math.floor(diff % 36e5 / 6e4));
    $('[data-u="s"]', cd).textContent = pad(Math.floor(diff % 6e4 / 1e3));
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- Contact details ---------------- */
  // Fill these in and the Contact page updates automatically.
  var CONTACT = [
    { icon: 'i-phone', label: 'Phone', value: '' },
    { icon: 'i-chat', label: 'WhatsApp', value: '' },
    { icon: 'i-mail', label: 'Email', value: '' },
    { icon: 'i-pin', label: 'Office', value: '' }
  ];
  var rows = $('#contactRows');
  CONTACT.forEach(function (c) {
    var row = document.createElement('div'); row.className = 'row';
    row.innerHTML = '<svg><use href="#' + c.icon + '"/></svg><div><b></b><span></span></div>';
    $('b', row).textContent = c.label;
    var span = $('span', row);
    if (c.value) span.textContent = c.value; else { span.textContent = 'Coming soon'; span.className = 'pending'; }
    rows.appendChild(row);
  });

  /* ---------------- Copy account number ---------------- */
  function selectText(el) { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  function wireCopy(btn, value, el) {
    btn.addEventListener('click', function () {
      var label = $('span', btn);
      var done = function () { label.textContent = 'Copied'; setTimeout(function () { label.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, function () { selectText(el); });
      else selectText(el);
    });
  }
  wireCopy($('#copyAcct'), '8108229724', $('#acctNo'));
  $$('[data-copy]').forEach(function (b) { wireCopy(b, b.dataset.copy, document.getElementById(b.dataset.copyEl)); });

  /* ---------------- Payment receipt check ----------------
     The form link only comes back from the server after the receipt passes. */
  var fileInput = $('#receiptFile'), drop = $('#drop'), verifyBtn = $('#verifyBtn'), verifyMsg = $('#verifyMsg'), receiptForm = $('#receiptForm');
  var chosen = null;
  function showMsg(kind, lines) {
    verifyMsg.className = 'verify-msg ' + kind; verifyMsg.textContent = '';
    if (kind === 'busy') {
      var sp = document.createElement('span'); sp.className = 'spin'; verifyMsg.appendChild(sp);
      verifyMsg.appendChild(document.createTextNode(lines[0]));
    } else {
      var headLine = document.createElement('b'); headLine.textContent = "We couldn't confirm this payment."; verifyMsg.appendChild(headLine);
      var ul = document.createElement('ul');
      lines.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      verifyMsg.appendChild(ul);
    }
    verifyMsg.hidden = false;
  }
  function pick(file) {
    if (!file) return;
    var okType = /^image\//.test(file.type) || file.type === 'application/pdf';
    if (!okType) { showMsg('bad', ['Upload an image (JPG or PNG) or a PDF of your receipt.']); return; }
    if (file.type === 'application/pdf' && file.size > 3 * 1024 * 1024) { showMsg('bad', ['That PDF is over 3 MB. Upload a screenshot of the receipt instead.']); return; }
    chosen = file;
    $('#dropTitle').textContent = file.name;
    $('#dropHint').textContent = 'Tap to choose a different file';
    drop.classList.add('has-file'); verifyBtn.disabled = false; verifyMsg.hidden = true;
    $('#step1').classList.add('done');
  }
  fileInput.addEventListener('change', function () { pick(fileInput.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); });
  function readAsBase64(file) {
    return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(String(r.result).split(',')[1]); }; r.onerror = reject; r.readAsDataURL(file); });
  }
  // Shrink photos so they upload quickly and stay under the size limit.
  function prepare(file) {
    if (file.type === 'application/pdf') return readAsBase64(file).then(function (b) { return { file: b, mediaType: 'application/pdf' }; });
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1800, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ file: c.toDataURL('image/jpeg', 0.88).split(',')[1], mediaType: 'image/jpeg' });
      };
      img.onerror = function () { URL.revokeObjectURL(url); readAsBase64(file).then(function (b) { resolve({ file: b, mediaType: file.type }); }); };
      img.src = url;
    });
  }
  receiptForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!chosen) return;
    verifyBtn.disabled = true;
    showMsg('busy', ['Checking your receipt. This takes a few seconds…']);
    prepare(chosen).then(function (payload) {
      return fetch('/api/verify-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return { ok: false, reasons: ['The receipt checker is unavailable right now. Please try again shortly.'] }; }); });
    }).then(function (data) {
      if (data && data.ok && data.formUrl) {
        verifyMsg.hidden = true; receiptForm.hidden = true;
        var lockedBox = $('#formLocked'); if (lockedBox) lockedBox.hidden = true;
        var okBox = $('#receiptOk'); if (okBox) okBox.hidden = false;
        $('#step2').classList.add('done'); $('#step3').classList.add('active');
        $('#okAmount').textContent = data.amount;
        $('#okRef').textContent = data.reference;
        $('#formLink').href = data.formUrl;
        var un = $('#unlocked'); un.hidden = false;
        if (animate) gsap.from(un, { y: 20, opacity: 0, scale: 0.97, duration: 0.9, ease: 'expo.out' });
        if (window.innerWidth < 1024) setTimeout(function () { scrollToEl($('#step3')); }, 150);
      } else {
        showMsg('bad', (data && data.reasons && data.reasons.length) ? data.reasons : ['Please try again with a clear screenshot of your receipt.']);
        verifyBtn.disabled = false;
      }
    }).catch(function () {
      showMsg('bad', ['We could not reach the receipt checker. Check your internet connection and try again.']);
      verifyBtn.disabled = false;
    });
  });

  /* ---------------- Boot ---------------- */
  route(true);
  setupScenes();
  if (animate) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
