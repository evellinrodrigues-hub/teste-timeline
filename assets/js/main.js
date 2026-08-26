/* ============================================================
   Sport Club do Recife — Balanço do 1º semestre
   Melhoria progressiva. A página é 100% funcional sem este
   arquivo: aqui só entram revelação ao rolar e o arrastar da
   linha do tempo.
   ============================================================ */

(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js');

  /* --------------------------------------------------------
     1. Revelação ao rolar
     -------------------------------------------------------- */
  function initReveal() {
    if (reducedMotion || !('IntersectionObserver' in window)) return;

    var selectors = [
      '.letter__title',
      '.letter__body',
      '.section-heading',
      '.stat-card',
      '.result-card',
      '.tl-item',
      '.closing__title',
      '.closing__body'
    ];

    var targets = document.querySelectorAll(selectors.join(','));
    if (!targets.length) return;

    targets.forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      // Escalona levemente os cards de uma mesma grade.
      el.style.transitionDelay = (i % 6) * 60 + 'ms';
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* --------------------------------------------------------
     2. Linha do tempo: arrastar com o mouse e teclado
     -------------------------------------------------------- */
  function initTimeline() {
    var timeline = document.querySelector('.timeline');
    if (!timeline) return;

    var hint = document.querySelector('.timeline__hint');
    var isDown = false;
    var startX = 0;
    var startScroll = 0;

    function isHorizontal() {
      return timeline.scrollWidth > timeline.clientWidth + 4;
    }

    /* --- arrastar --- */
    timeline.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || !isHorizontal()) return;
      isDown = true;
      startX = event.clientX;
      startScroll = timeline.scrollLeft;
      timeline.classList.add('is-grabbing');
      timeline.setPointerCapture(event.pointerId);
    });

    timeline.addEventListener('pointermove', function (event) {
      if (!isDown) return;
      timeline.scrollLeft = startScroll - (event.clientX - startX);
    });

    ['pointerup', 'pointercancel'].forEach(function (type) {
      timeline.addEventListener(type, function () {
        isDown = false;
        timeline.classList.remove('is-grabbing');
      });
    });

    // Não deixa o arrasto virar clique nos links/imagens.
    timeline.addEventListener('click', function (event) {
      if (timeline.classList.contains('is-grabbing')) event.preventDefault();
    });

    /* --- teclado --- */
    timeline.addEventListener('keydown', function (event) {
      if (!isHorizontal()) return;

      var step = timeline.clientWidth * 0.6;
      var delta = 0;

      switch (event.key) {
        case 'ArrowRight': delta = step; break;
        case 'ArrowLeft':  delta = -step; break;
        case 'Home':       timeline.scrollTo({ left: 0, behavior: 'smooth' }); event.preventDefault(); return;
        case 'End':        timeline.scrollTo({ left: timeline.scrollWidth, behavior: 'smooth' }); event.preventDefault(); return;
        default: return;
      }

      timeline.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
      event.preventDefault();
    });

    /* --- esconde a dica depois da primeira rolagem --- */
    if (hint) {
      timeline.addEventListener(
        'scroll',
        function () {
          if (timeline.scrollLeft > 24) hint.style.opacity = '0';
        },
        { passive: true, once: false }
      );
      hint.style.transition = 'opacity 300ms ease';
    }
  }

  /* --------------------------------------------------------
     Bootstrap
     -------------------------------------------------------- */
  function init() {
    initReveal();
    initTimeline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
