/* main.js — 页面胶水层（入场闩、目录点线、shelters 传递、顶栏/侧栏行为）
   对应 analysis/00 数据流与 analysis/01/02/05。 */
(function () {
  'use strict';

  const hero = document.querySelector('.launch-hero');
  const words = hero.querySelector('.words');
  const dateEl = hero.querySelector('.date');
  const titleEl = hero.querySelector('.title');
  const indexEl = hero.querySelector('.index');

  // ---- 目录引导点线（原站 160 个 "."，SOURCE） ----
  const leaders = hero.querySelectorAll('.index-leader');
  leaders.forEach((el) => { el.textContent = '.'.repeat(160); });

  // ---- :Claude: dlig 连字兜底（known-gaps G2）：无 anthropicSerif 字面时替换为纯文本 ----
  function fixClaudeGlyph() {
    const el = hero.querySelector('.title-claude');
    if (!el) return;
    let hasLigFont = false;
    if (document.fonts) {
      document.fonts.forEach((f) => {
        if (/anthropicserif/i.test(f.family) && f.status === 'loaded') hasLigFont = true;
      });
    }
    if (!hasLigFont) el.textContent = 'Claude';
  }

  // ---- shelters：date/title/index 的归一化矩形 + 呼吸边距（SOURCE 语义） ----
  function normRect(host, target, padX, padY) {
    if (!(target instanceof HTMLElement)) return [0, 0, 0, 0];
    const s = host.clientWidth, i = host.clientHeight;
    let n = 0, o = 0, r = target;
    while (r && r !== host) { n += r.offsetLeft; o += r.offsetTop; r = r.offsetParent; }
    return [
      (n - padX) / s, (o - padY) / i,
      (n + target.offsetWidth + padX) / s, (o + target.offsetHeight + padY) / i,
    ];
  }
  function computeShelters() {
    return [
      normRect(hero, dateEl, 32, 18),
      normRect(hero, titleEl, 40, 22),
      normRect(hero, indexEl, 56, 30),
    ];
  }

  // ---- 启动场景 ----
  let scene = null;
  if (!hero.classList.contains('unstable')) {
    scene = window.createFableHero(hero, {
      assets: '/fx/hero/',
      classes: {
        canvas: 'hero-canvas', drawn: 'drawn', overBird: 'over-bird',
        looks: 'looks', look: 'look', on: 'on', unsupported: 'unsupported',
      },
      shelters: computeShelters(),
    });
    if (scene) {
      const ro = new ResizeObserver(() => scene.setShelters(...computeShelters()));
      ro.observe(hero);
      document.fonts.ready.then(() => scene.setShelters(...computeShelters()));
    }
  }

  // ---- 入场闩（SOURCE）：fonts.ready → data-fx-ready ----
  document.fonts.ready.then(() => {
    fixClaudeGlyph();
    hero.setAttribute('data-fx-ready', '');
  });
  // 动画结束后清理 animation（SOURCE）
  hero.addEventListener('animationend', (e) => {
    const t = e.target;
    if (t instanceof HTMLElement) {
      t.style.animation = 'none';
      t.style.filter = 'none';
      t.style.opacity = '1';
    }
  }, true);

  // ---- 顶栏 hideOnScroll（G6: 阈值 GUESS） ----
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY + 4 && y > 40) header.classList.add('is-hidden');
    else if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  // ---- side-toc：滚过 hero 显示 + active 跟随 ----
  const toc = document.querySelector('.side-toc');
  const links = [...document.querySelectorAll('.toc-link')];
  const targets = links.map((a) => document.querySelector(a.getAttribute('href')));
  function onScrollToc() {
    toc.classList.toggle('is-visible', window.scrollY > hero.offsetHeight * 0.6);
    let active = 0;
    targets.forEach((t, i) => {
      if (t && t.getBoundingClientRect().top < window.innerHeight * 0.4) active = i;
    });
    links.forEach((a, i) => a.classList.toggle('is-active', i === active));
  }
  window.addEventListener('scroll', onScrollToc, { passive: true });
  onScrollToc();

  // 复刻范围内未包含的章节：链接停留在页内顶部
  links.concat([...hero.querySelectorAll('.index-row')]).forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') && href !== '#introduction' && !document.querySelector(href)) {
      a.addEventListener('click', (e) => e.preventDefault());
    }
  });
})();
