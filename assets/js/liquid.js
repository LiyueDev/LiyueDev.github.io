/* ── 首屏液体 + 指针交互（WebGL） ──
   一个全屏三角 + 一段片元着色器：域扭曲的 fbm 高度场，配合等值线当"水面反光"，
   在 GPU 上逐像素算，画布按设备像素密度开（CSS × dpr × Q），所以任何缩放下都是
   清晰的，没有放大糊的问题，也不靠一层大柔光去糊边。
   指针移动时把采样坐标朝反方向推、再掺一点切向旋转，看起来就是液面被手推开了；
   停手后强度自己衰减，液面缓慢归位。没有 WebGL 就安静留白，不报错、不卡。 */
(function () {
  var cv = document.getElementById('fluidCv');
  if (!cv) return;
  var gl = cv.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SPEED = .34;               /* 流动速度：越小越慢 */
  var Q = .95;                   /* 在 devicePixelRatio 之上再乘的质量系数 */

  /* 指针交互：PUSH 置 0 就关掉 */
  var REACH = 190;               /* 影响半径，CSS 像素 */
  var PUSH = .15;                /* 最大位移，噪声空间单位（约等于液面被推开一个波纹） */
  var SWIRL = .34;               /* 推开方向里掺多少切向旋转 */

  var VS = [
    'attribute vec2 a;',
    'void main(){ gl_Position = vec4(a, 0.0, 1.0); }'
  ].join('\n');

  var FS = [
    'precision highp float;',
    'uniform vec2 u_res;',        // CSS 尺寸
    'uniform vec2 u_buf;',        // 画布像素尺寸（drawing buffer）
    'uniform float u_t;',
    'uniform vec2 u_ptrn;',       // 指针位置，归一化 0~1，左上原点
    'uniform float u_act;',       // 指针活跃度 0~1
    'uniform float u_reach;',
    'uniform float u_push;',
    'uniform float u_swirl;',
    '',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float s = 0.0, amp = 0.56;',
    '  for (int i = 0; i < 4; i++) { s += amp * noise(p); p = p * 2.03 + vec2(11.3, 7.7); amp *= 0.5; }',
    '  return s;',
    '}',
    '',
    '/* 液态的高度场：两层 fbm 互相扭曲，再加一层细节，慢速漂移 */',
    'float liquid(vec2 p, float t) {',
    '  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.11)), fbm(p + vec2(5.2, t * 0.09) + vec2(1.6, 0.0)));',
    '  vec2 w = p + (q - 0.5) * 1.62;',
    '  return fbm(w * 1.18 + vec2(t * 0.05, -t * 0.06));',
    '}',
    '',
    'void main(){',
    '  /* 归一化坐标：除的是画布自己的像素尺寸，之后任何缩放、DPR 都不影响 */',
    '  vec2 uv = vec2(gl_FragCoord.x / u_buf.x, 1.0 - gl_FragCoord.y / u_buf.y);',
    '  float aspect = u_res.x / u_res.y;',
    '  float tall = 1.0 - smoothstep(0.70, 1.05, aspect);',   // 竖屏手机：液团放大一点、浓一点
    '  vec2 p = vec2(uv.x * aspect, uv.y) * mix(1.06, 1.58, smoothstep(0.55, 1.30, aspect));',
    '',
    '  /* 指针：归一化坐标算距离（乘上实时盒子尺寸），和画布分辨率、DPR 都无关 */',
    '  vec2 d = (uv - u_ptrn) * vec2(u_res.x / u_res.y, 1.0);',
    '  float distD = length(d) + 0.000001;',
    '  float dist = distD * u_res.y;',                // 换回 CSS 像素，方便按 190px 这种手感调
    '  float infl = max(0.0, 1.0 - dist / u_reach);',
    '  infl = infl * infl * u_act;',
    '  vec2 dir = d / distD;',
    '  float ca = cos(u_swirl), sa = sin(u_swirl);',
    '  vec2 sd = vec2(dir.x * ca - dir.y * sa, dir.x * sa + dir.y * ca);',
    '  p -= sd * infl * u_push;',
    '',
    '  float h = liquid(p, u_t);',
    '',
    '  /* 底色：靠近白，再压两档淡蓝 */',
    '  vec3 bg   = vec3(0.980, 0.986, 0.996);',
    '  vec3 mid  = vec3(0.878, 0.929, 0.988);',
    '  vec3 deep = vec3(0.663, 0.788, 0.953);',
    '  vec3 col = mix(bg, mid, smoothstep(0.26, 0.66, h));',
    '  col = mix(col, deep, smoothstep(0.48, 0.86, h) * (0.80 + 0.14 * tall));',
    '',
    '  /* 等值线：水面反光。三条窄带，跟着流动走，是画面里唯一的硬边 */',
    '  #define ISO(v, lvl, w) (1.0 - smoothstep(0.0, w, abs(v - lvl)))',
    '  float g1 = ISO(h, 0.470, 0.042);',
    '  float g2 = ISO(h, 0.600, 0.036);',
    '  float g3 = ISO(h, 0.720, 0.030);',
    '  float glow = g1 * 0.40 + g2 * 0.34 + g3 * 0.28;',
    '  float dark = ISO(h, 0.442, 0.055) * 0.26 + ISO(h, 0.572, 0.048) * 0.18;',
    '  col = mix(col, vec3(1.0), glow * 0.55);',
    '  col = mix(col, vec3(0.74, 0.83, 0.95), dark);',
    '',
    '  /* 指针处轻微提亮，像液面被压出的那一点反光；范围很小，不抢视线 */',
    '  float sheen = max(0.0, 1.0 - dist / (u_reach * 0.55));',
    '  col = mix(col, vec3(1.0), sheen * sheen * u_act * 0.06);',
    '',
    '  /* 左右边缘淡出，代替原来那层 scale(1.08) 遮边，坐标也就干净了 */',
    '  float edgeA = smoothstep(0.0, 60.0, uv.x * u_res.x) * smoothstep(0.0, 60.0, (1.0 - uv.x) * u_res.x);',
    '  gl_FragColor = vec4(col, edgeA);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.__fluidErr) window.__fluidErr.push(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VS);
  var fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    if (window.__fluidErr) window.__fluidErr.push(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);

  var U = {
    res: gl.getUniformLocation(prog, 'u_res'),
    buf: gl.getUniformLocation(prog, 'u_buf'),
    t: gl.getUniformLocation(prog, 'u_t'),
    ptrn: gl.getUniformLocation(prog, 'u_ptrn'),
    act: gl.getUniformLocation(prog, 'u_act'),
    reach: gl.getUniformLocation(prog, 'u_reach'),
    push: gl.getUniformLocation(prog, 'u_push'),
    swirl: gl.getUniformLocation(prog, 'u_swirl')
  };

  var CW = 1, CH = 1, BW = 1, BH = 1, PX = 1, scaleK = 1, slow = 0;
  var ptr = { x: 0, y: 0, tx: 0, ty: 0, active: 0, seen: 0 };
  var t0 = 0, last = 0, raf = 0;

  function resize() {
    var box = cv.parentElement.getBoundingClientRect();
    CW = Math.max(24, Math.round(Math.max(1, box.width)));
    CH = Math.max(24, Math.round(Math.max(1, box.height)));
    PX = Math.min(2, window.devicePixelRatio || 1) * Q * scaleK;
    var w = Math.round(CW * PX), h = Math.round(CH * PX);
    /* 兜底：像素总量太大的屏幕降一档，别把老显卡拖垮 */
    if (w * h > 3.2e6) { var k = Math.sqrt(3.2e6 / (w * h)); w = Math.round(w * k); h = Math.round(h * k); PX = w / CW; }
    cv.width = w; cv.height = h;
    BW = w; BH = h;
    gl.viewport(0, 0, w, h);
    draw(performance.now() / 1000);
  }

  function draw(ts) {
    /* 尺寸每帧从真实盒子里取，不再依赖缓存值：字体撑高、滚动条出现都能立刻跟上 */
    var box = cv.getBoundingClientRect();
    var bw = Math.max(1, box.width), bh = Math.max(1, box.height);
    gl.uniform2f(U.res, bw, bh);
    gl.uniform2f(U.buf, cv.width, cv.height);
    gl.uniform1f(U.t, ts * SPEED);
    gl.uniform2f(U.ptrn, ptr.x, ptr.y);
    gl.uniform1f(U.act, ptr.active);
    gl.uniform1f(U.reach, REACH);
    gl.uniform1f(U.push, PUSH);
    gl.uniform1f(U.swirl, SWIRL);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 40) return;
    var dt = Math.min(.12, (now - last) / 1000);
    last = now;

    /* 指针位置缓动跟手；停手之后 active 慢慢回落，液面自己归位 */
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 12);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 12);
    if (now - ptr.seen > 110) ptr.active *= Math.pow(.5, dt / .55);

    /* 帧率掉下来就自动降一档分辨率，宁可少一点细节也别卡 */
    if (dt > .034 && scaleK > .62) {
      if (++slow > 24) { scaleK -= .15; slow = 0; last = now; resize(); return; }
    } else if (slow) { slow = 0; }

    draw(now / 1000);
  }

  t0 = performance.now(); last = t0;
  resize();

  var hero = cv.closest('.hero');
  ptr.x = ptr.tx = .5; ptr.y = ptr.ty = .5;
  if (hero && !reduce) {
    hero.addEventListener('pointermove', function (e) {
      /* 直接存归一化坐标：画布尺寸之后怎么变都不用再换算 */
      var r = cv.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left) / Math.max(1, r.width);
      ptr.ty = (e.clientY - r.top) / Math.max(1, r.height);
      ptr.active = 1;
      ptr.seen = performance.now();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { ptr.seen = 0; }, { passive: true });
    raf = requestAnimationFrame(loop);
  }

  /* 尺寸要跟着真实布局走：字体会撑高首屏、滚动条会出现，都会改变盒子尺寸。
     只监听 window resize 会在这些时刻漏掉，u_res 一旧，液体就被拉歪，指针也跟着偏。 */
  var rt = 0;
  function remeasure() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var box = cv.parentElement.getBoundingClientRect();
      if (Math.abs(box.width - CW) > 1 || Math.abs(box.height - CH) > 1) resize();
      else draw(performance.now() / 1000);
    }, 120);
  }
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { setTimeout(remeasure, 40); }); }
  if ('ResizeObserver' in window) { new ResizeObserver(remeasure).observe(cv.parentElement); }
  /* 兜底：每 20 帧核对一次，盒子被别的东西改动过也能自己纠正 */
  if ('function' === typeof window.requestAnimationFrame) {
    setInterval(function () {
      if (raf === 0 && !reduce) return;
      var box = cv.parentElement.getBoundingClientRect();
      if (Math.abs(box.width - CW) > 1 || Math.abs(box.height - CH) > 1) resize();
    }, 500);
  }

  /* 滚出去就停，别在后台空转 */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (reduce) return;
        if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
      });
    }, { threshold: 0.02 }).observe(cv.parentElement);
  }
})();
