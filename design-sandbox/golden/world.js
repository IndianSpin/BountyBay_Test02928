/* LANTERN LUXE v4 — the world behind every golden state, in three depth planes.
 * back: the approved painted v4 wharf (img/scene-wharf4.jpg), softly defocused and dimmed (props never compete with play)
 * spotlight: <div data-world data-focus="50% 62%"> lifts the one place the eye should go on this screen
 * front: the first-person table (img/table-fp4.png) — mounted by <div data-counter>
 * Ambient motion is light only (lantern flicker); it stops under prefers-reduced-motion.
 * Port as <World focus="…"/> and <Counter/>; ship both images to apps/web/public/game/scene/. */
(function () {
  const GLOWS = [[14, 24], [31.8, 19.5], [68.3, 19.5], [85.8, 25]];
  const SCENE = `<div class="w-paint"><div class="w-bg"></div>${GLOWS.map(([x, y], i) =>
    `<i class="w-glow" style="left:${x}%;top:${y}%;animation-delay:${-i * 1.3}s"></i>`).join('')}</div><div class="w-grade"></div><div class="w-spot"></div><div class="w-vignette"></div>`;
  window.World = {
    mount() {
      document.querySelectorAll('[data-world]').forEach((el) => {
        el.innerHTML = SCENE; el.classList.add('w-scene');
        const f = (el.dataset.focus || '50% 55%').split(' ');
        el.style.setProperty('--focus-x', f[0]); el.style.setProperty('--focus-y', f[1]);
      });
      document.querySelectorAll('[data-counter]').forEach((el) => { el.innerHTML = '<div class="w-table"></div>'; el.classList.add('w-counter'); });
    },
  };
})();
