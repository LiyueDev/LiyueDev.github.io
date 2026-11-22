/* LyLaunch 项目页脚本：reveal 淡入 / 首屏光晕跟随指针 / 导航收窄 / 界面轮播 / 滚轮整页翻页
   拆自原 lylaunch-web/index.html 的内联脚本，逻辑与顺序未改动。
   注意：documentElement.classList.add('js') 那一段仍留在页面内联（要在首帧前生效，防闪烁）。 */

/* 进入视口淡入：只做一次，尊重 prefers-reduced-motion */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!els.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', thresholds: [0, 0.12] });
  els.forEach(function (el) { io.observe(el); });
})();

/* 首屏光晕跟随指针（仅精确指针 + 允许动效时） */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero || !window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var raf = 0, mx = 50, my = 40;
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    mx = ((e.clientX - r.left) / r.width) * 100;
    my = ((e.clientY - r.top) / r.height) * 100;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      hero.style.setProperty('--mx', mx.toFixed(1) + '%');
      hero.style.setProperty('--my', my.toFixed(1) + '%');
    });
  });
})();

/* 导航栏：顶部透明，滚过 24px 后收窄并加毛玻璃 */
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var onScroll = function () {
    nav.classList.toggle('on', (window.scrollY || window.pageYOffset || 0) > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

/* 界面轮播：自动播放 + 箭头 / 圆点 / 滑动切换 */
(function () {
  var car = document.getElementById('car');
  if (!car) return;
  var track = car.querySelector('.car-track');
  var slides = Array.prototype.slice.call(car.querySelectorAll('.car-slide'));
  var dots = Array.prototype.slice.call(car.querySelectorAll('.car-dot'));
  var capB = car.querySelector('.car-cap b');
  var capS = car.querySelector('.car-cap span');
  var count = car.querySelector('.car-count b');
  var prog = car.querySelector('.car-prog i');
  var prevBtn = car.querySelector('[data-car-prev]');
  var nextBtn = car.querySelector('[data-car-next]');
  var stage = car.querySelector('.car-stage');
  if (!track || !slides.length) return;

  var i = 0;
  var DUR = 7000;
  var acc = 0, last = 0, paused = false, visible = false, raf = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  slides.forEach(function (s, k) {
    s.setAttribute('aria-label', '第 ' + (k + 1) + ' 屏，共 ' + slides.length + ' 屏：' + (s.getAttribute('data-title') || ''));
  });

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function show(n) {
    i = (n + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-i * 100) + '%)';
    slides.forEach(function (s, k) {
      s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    dots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    capB.textContent = slides[i].getAttribute('data-title') || '';
    capS.textContent = slides[i].getAttribute('data-desc') || '';
    count.textContent = pad(i + 1);
    acc = 0;
    if (prog) prog.style.width = '0%';
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { show(i - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { show(i + 1); });
  dots.forEach(function (d, k) {
    d.addEventListener('click', function () { show(k); });
  });

  car.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
  });

  var sx = 0, sy = 0, tracking = false;
  if (stage) {
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY; tracking = true;
      if (e.pointerType !== 'mouse') paused = true;
      if (stage.setPointerCapture) {
        try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      }
    });
    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      if (e.pointerType !== 'mouse') paused = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.15) show(i + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', function (e) {
      tracking = false;
      if (e.pointerType !== 'mouse') paused = false;
    });
  }

  car.addEventListener('pointerenter', function (e) {
    if (!e.pointerType || e.pointerType === 'mouse') paused = true;
  });
  car.addEventListener('pointerleave', function (e) {
    if (!e.pointerType || e.pointerType === 'mouse') paused = false;
  });
  car.addEventListener('focusin', function (e) {
    if (e.target.matches && e.target.matches(':focus-visible')) paused = true;
  });
  car.addEventListener('focusout', function (e) {
    if (!car.contains(e.relatedTarget)) paused = false;
  });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(120, now - last);
    last = now;
    if (visible && !paused && !document.hidden && !reduce) {
      acc += dt;
      if (acc >= DUR) {
        show(i + 1);
      } else if (prog) {
        prog.style.width = Math.min(100, (acc / DUR) * 100) + '%';
      }
    }
  }

  function start() {
    if (raf || reduce) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var nowVisible = !!(entries[0] && entries[0].isIntersecting);
      if (nowVisible === visible) return;
      visible = nowVisible;
      if (visible) { acc = 0; last = 0; start(); }
      else { stop(); }
    }, { threshold: 0.3 }).observe(car);
  } else {
    visible = true;
    start();
  }

  show(0);
})();

/* 滚轮翻页：一屏一屏翻；下一板块若在当前屏内则对齐到板块顶部 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var locked = false, acc = 0, lastT = 0;
  var pages = Array.prototype.slice.call(document.querySelectorAll('section'));

  function maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function tops() {
    return pages.map(function (p) {
      var m = parseFloat(getComputedStyle(p).scrollMarginTop) || 0;
      return Math.round(p.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - m);
    });
  }

  function revealViewport() {
    var h = window.innerHeight;
    var els = document.querySelectorAll('.reveal:not(.in)');
    var i, r;
    for (i = 0; i < els.length; i++) {
      r = els[i].getBoundingClientRect();
      if (r.top < h && r.bottom > 0) els[i].classList.add('in');
    }
  }

  function flip(dir) {
    var y = window.scrollY || window.pageYOffset || 0;
    var h = window.innerHeight;
    if (!h) return;
    var list = tops();
    var page = y + dir * h;
    var target = page;
    var i, t, prev = null;
    if (dir > 0) {
      for (i = 0; i < list.length; i++) {
        t = list[i];
        if (t > y + 4) {
          if (t <= page + 2) target = t;
          break;
        }
      }
    } else {
      for (i = 0; i < list.length; i++) {
        t = list[i];
        if (t < y - 4) prev = t;
      }
      if (prev !== null && prev >= page - 2) target = prev;
    }
    target = Math.max(0, Math.min(maxY(), target));
    if (Math.abs(target - y) < 2) return;
    locked = true;
    window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    window.setTimeout(function () {
      locked = false;
      revealViewport();
    }, reduce ? 0 : 850);
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) return;
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (Math.abs(dy) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    if (locked) return;
    var now = Date.now();
    if (now - lastT > 260) acc = 0;
    lastT = now;
    acc += dy;
    if (Math.abs(acc) < 26) return;
    var dir = acc > 0 ? 1 : -1;
    acc = 0;
    flip(dir);
  }, { passive: false });
})();
