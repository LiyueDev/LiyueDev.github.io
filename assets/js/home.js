/* 首页全局脚本：年份 / 导航滚动态 / 本地时钟 / 入场 reveal / 作品预览惰性挂载
   以及三张卡各自的轮播（像素植物、设计样本、LyLaunch 截图）。
   拆自 index.html 的 4 段内联脚本，逻辑与顺序未改动。 */

(function () {
  /* ── 年份 ── */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ── 导航滚动态 ── */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('on', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── 本地时钟 ── */
  const clock = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai'
  });
  const tick = () => { clock.innerHTML = fmt.format(new Date()) + '<span>CST</span>'; };
  tick();
  setInterval(tick, 20000);

  /* ── 入场 ── */
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ── 作品实时预览：进入视口才挂载，离开即卸载 ── */
  const previews = [...document.querySelectorAll('.preview[data-src]')];
  const timers = new WeakMap();

  const mount = (p) => {
    if (p.dataset.mounted === '1') return;
    p.dataset.mounted = '1';
    const f = document.createElement('iframe');
    f.src = p.dataset.src;
    f.title = p.dataset.title || '作品预览';
    f.loading = 'lazy';
    f.setAttribute('scrolling', 'no');
    f.setAttribute('tabindex', '-1');
    f.setAttribute('aria-hidden', 'true');
    f.addEventListener('load', () => p.classList.add('ready'));
    p.appendChild(f);
  };
  const unmount = (p) => {
    if (p.dataset.mounted !== '1') return;
    const f = p.querySelector('iframe');
    if (f) f.remove();
    delete p.dataset.mounted;
    p.classList.remove('ready');
  };

  const pio = new IntersectionObserver((es) => {
    es.forEach((e) => {
      const p = e.target;
      if (e.isIntersecting) {
        if (!timers.has(p)) timers.set(p, setTimeout(() => mount(p), 400));
      } else {
        clearTimeout(timers.get(p));
        timers.delete(p);
        if (e.boundingClientRect.top < -window.innerHeight * 1.2 ||
            e.boundingClientRect.top > window.innerHeight * 1.6) unmount(p);
      }
    });
  }, { rootMargin: '240px 0px' });
  previews.forEach((p) => pio.observe(p));

  /* ── 平滑锚点 ── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      ev.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ── Skill 02 卡片内的迷你轮播：进入视口才加载引擎 ── */
(function () {
  var stage = document.getElementById('pfStage');
  if (!stage) return;

  var SLIDES = [
    { k: 'peach', cn: '桃' },
    { k: 'cherry', cn: '樱' },
    { k: 'pear', cn: '梨' },
    { k: 'ginkgo', cn: '银杏' },
    { k: 'bush', cn: '灌木' },
    { k: 'pine', cn: '松' }
  ];
  var idx = 0, cur = null, busy = false, loaded = false, inView = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var noEl = document.getElementById('pfNo');
  var keyEl = document.getElementById('pfKey');
  var cnEl = document.getElementById('pfCn');
  var dotsEl = document.getElementById('pfDots');

  SLIDES.forEach(function (s, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', s.cn);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', function (e) { e.stopPropagation(); go(n); });
    dotsEl.appendChild(b);
  });
  var dots = [].slice.call(dotsEl.children);

  function label() {
    noEl.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + SLIDES.length).slice(-2);
    keyEl.textContent = SLIDES[idx].k;
    cnEl.textContent = SLIDES[idx].cn;
    dots.forEach(function (d, n) {
      d.setAttribute('aria-selected', n === idx ? 'true' : 'false');
    });
  }

  function mountNow() {
    if (!loaded || !inView || !window.PF) return;
    if (cur) { try { cur.stop(); } catch (e) {} cur = null; }
    stage.innerHTML = '';
    cur = window.PF.mount(stage, { name: SLIDES[idx].k, strength: 0.9, gusts: 0.76 });
    fitWidth();
  }

  /* 引擎按整数倍缩放，窄容器里画布可能比面板宽：等比缩到能放下 */
  function fitWidth() {
    var cvs = stage.querySelectorAll('canvas');
    var scene = cvs[1];
    if (!scene) return;
    scene.style.transform = '';
    var sw = parseFloat(scene.style.width) || 0;
    var avail = stage.clientWidth - 10;
    if (sw > avail && sw > 0) {
      scene.style.transform = 'scale(' + (avail / sw).toFixed(3) + ')';
    }
  }

  function go(next) {
    next = (next + SLIDES.length) % SLIDES.length;
    if (next === idx || busy) return;
    busy = true;
    if (reduce) { idx = next; label(); mountNow(); busy = false; return; }
    stage.classList.add('is-out');
    setTimeout(function () {
      idx = next;
      label();
      mountNow();
      requestAnimationFrame(function () {
        stage.classList.remove('is-out');
        setTimeout(function () { busy = false; }, 320);
      });
    }, 300);
  }

  document.getElementById('pfPrev').addEventListener('click', function (e) {
    e.stopPropagation(); go(idx - 1);
  });
  document.getElementById('pfNext').addEventListener('click', function (e) {
    e.stopPropagation(); go(idx + 1);
  });
  stage.addEventListener('click', function () { go(idx + 1); });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
  });

  function loadEngine(cb) {
    if (window.PF) { loaded = true; return cb(); }
    var s = document.createElement('script');
    s.src = 'showpages/liyue-pixel-plants/pixel-flora.js';
    s.onload = function () {
      loaded = typeof window.PF !== 'undefined' && typeof window.PF.mount === 'function';
      if (loaded) cb();
    };
    document.body.appendChild(s);
  }

  label();

  var oio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        inView = true;
        if (!loaded) loadEngine(mountNow);
        else if (!cur) mountNow();
      } else {
        inView = false;
        if (cur) { try { cur.stop(); } catch (er) {} cur = null; }
      }
    });
  }, { rootMargin: '260px 0px' });
  oio.observe(stage);

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(fitWidth, 180);
  }, { passive: true });
})();

/* ── Skill 01 卡片内的样本轮播 ── */
(function () {
  var stage = document.getElementById('dsStage');
  if (!stage) return;

  var slides = [].slice.call(stage.querySelectorAll('.ds-slide'));
  var META = [['color', '色彩'], ['type', '字体'], ['form', '形态'], ['parts', '组件'], ['motion', '动效']];
  var idx = 0, busy = false;

  var noEl = document.getElementById('dsNo');
  var keyEl = document.getElementById('dsKey');
  var cnEl = document.getElementById('dsCn');
  var dotsEl = document.getElementById('dsDots');

  slides.forEach(function (s, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', META[n][1]);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', function () { go(n); });
    dotsEl.appendChild(b);
  });
  var dots = [].slice.call(dotsEl.children);

  function label() {
    noEl.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + slides.length).slice(-2);
    keyEl.textContent = META[idx][0];
    cnEl.textContent = META[idx][1];
    dots.forEach(function (d, n) {
      d.setAttribute('aria-selected', n === idx ? 'true' : 'false');
    });
  }

  function go(next) {
    next = (next + slides.length) % slides.length;
    if (next === idx || busy) return;
    busy = true;
    slides[idx].classList.remove('on');
    idx = next;
    slides[idx].classList.add('on');
    label();
    setTimeout(function () { busy = false; }, 380);
  }

  document.getElementById('dsPrev').addEventListener('click', function () { go(idx - 1); });
  document.getElementById('dsNext').addEventListener('click', function () { go(idx + 1); });

  label();
})();

/* ── LyLaunch 卡片内的截图轮播 ── */
(function () {
  var stage = document.getElementById('lyStage');
  if (!stage) return;

  var shots = [].slice.call(stage.querySelectorAll('.ly-shot'));
  var idx = 0, busy = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var noEl = document.getElementById('lyNo');
  var keyEl = document.getElementById('lyKey');
  var cnEl = document.getElementById('lyCn');
  var dotsEl = document.getElementById('lyDots');

  shots.forEach(function (s, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', s.dataset.cn);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', function (e) { e.stopPropagation(); go(n); });
    dotsEl.appendChild(b);
  });
  var dots = [].slice.call(dotsEl.children);

  function label() {
    noEl.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + shots.length).slice(-2);
    keyEl.textContent = shots[idx].dataset.key;
    cnEl.textContent = shots[idx].dataset.cn;
    dots.forEach(function (d, n) {
      d.setAttribute('aria-selected', n === idx ? 'true' : 'false');
    });
  }

  function go(next) {
    next = (next + shots.length) % shots.length;
    if (next === idx || busy) return;
    busy = true;
    shots[next].classList.add('on');
    shots[idx].classList.remove('on');
    idx = next;
    label();
    setTimeout(function () { busy = false; }, reduce ? 0 : 340);
  }

  document.getElementById('lyPrev').addEventListener('click', function (e) {
    e.stopPropagation(); go(idx - 1);
  });
  document.getElementById('lyNext').addEventListener('click', function (e) {
    e.stopPropagation(); go(idx + 1);
  });
  stage.addEventListener('click', function () { go(idx + 1); });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
  });

  label();
})();

/* ── 滚轮整屏翻页 ─────────────────────────────────────────────
   一次滚动 = 下一屏（和项目页同一手感）；区块比视口高时在区块内部再切几屏，
   所以不会像纯「按 section 跳」那样把中间内容整段跳过。
   只在精确指针（鼠标/触控板）启用，触屏保留原生滚动。 */
(function () {
  if (!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var locked = false, acc = 0, lastT = 0;

  function vh() { return window.innerHeight; }
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - vh()); }

  /* 翻屏只到「作品」开头为止，之后交回原生滚轮 */
  function stopY() {
    var w = document.getElementById('work');
    if (!w) return null;
    var m = parseFloat(getComputedStyle(w).scrollMarginTop) || 0;
    return Math.round(w.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) - m);
  }

  function anchors() {
    var y = window.scrollY || window.pageYOffset || 0;
    var h = vh(), step = Math.max(260, h - 92);
    var st = stopY();
    var out = [0];
    var secs = document.querySelectorAll('section.section, footer');
    for (var k = 0; k < secs.length; k++) {
      var s = secs[k];
      var m = parseFloat(getComputedStyle(s).scrollMarginTop) || 0;
      var r = s.getBoundingClientRect();
      var top = Math.round(r.top + y - m);
      var bottom = Math.round(r.bottom + y);
      if (st !== null && top >= st - 4) break;
      out.push(top);
      if (bottom - top > h * 0.94) {
        var p = top + step;
        while (p < bottom - h * 0.62) { out.push(p); p += step; }
      }
    }
    if (st !== null) out.push(st);
    var my = maxY();
    out.push(my);
    var lim = (st !== null ? st : my);
    out = out.filter(function (v) { return v >= 0 && v <= lim; }).sort(function (a, b) { return a - b; });
    var keep = [];
    for (var i = 0; i < out.length; i++) {
      if (!keep.length || out[i] - keep[keep.length - 1] > 70) keep.push(out[i]);
    }
    if (keep[keep.length - 1] < my) keep.push(my);
    return keep;
  }

  function revealViewport() {
    var h = vh(), els = document.querySelectorAll('.reveal:not(.in)'), i, r;
    for (i = 0; i < els.length; i++) {
      r = els[i].getBoundingClientRect();
      if (r.top < h && r.bottom > 0) els[i].classList.add('in');
    }
  }

  function flip(dir) {
    var y = window.scrollY || window.pageYOffset || 0;
    var list = anchors(), target = null, i;
    if (dir > 0) {
      for (i = 0; i < list.length; i++) if (list[i] > y + 2) { target = list[i]; break; }
    } else {
      for (i = list.length - 1; i >= 0; i--) if (list[i] < y - 2) { target = list[i]; break; }
    }
    if (target === null) return false;
    target = Math.max(0, Math.min(maxY(), target));
    if (Math.abs(target - y) < 2) return false;
    locked = true;
    window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    window.setTimeout(function () { locked = false; revealViewport(); }, reduce ? 0 : 760);
    return true;
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= vh();
    if (!dy || Math.abs(dy) <= Math.abs(e.deltaX)) return;
    // 到了「作品」就交回原生滚轮，不再整屏翻
    var st = stopY();
    if (st !== null && (window.scrollY || window.pageYOffset || 0) >= st - 4) return;
    e.preventDefault();
    if (locked) return;
    var now = Date.now();
    if (now - lastT > 240) acc = 0;
    lastT = now;
    acc += dy;
    if (Math.abs(acc) < 22) return;
    var dir = acc > 0 ? 1 : -1;
    acc = 0;
    flip(dir);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var st = stopY();
    if (st !== null && (window.scrollY || window.pageYOffset || 0) >= st - 4) return;
    if (e.key === 'PageDown') { e.preventDefault(); flip(1); }
    else if (e.key === 'PageUp') { e.preventDefault(); flip(-1); }
    else if (e.key === 'Home') { if (locked) return; e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); locked = true; setTimeout(function () { locked = false; }, reduce ? 0 : 760); }
    else if (e.key === 'End') { if (locked) return; e.preventDefault(); window.scrollTo({ top: maxY(), behavior: reduce ? 'auto' : 'smooth' }); locked = true; setTimeout(function () { locked = false; }, reduce ? 0 : 760); }
  });
})();