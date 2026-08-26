/**
 * desktop.js — canvas 1:1 responsivo + pin da linha do tempo.
 * Vanilla, sem dependências.
 *
 * Três responsabilidades:
 *
 *   1. ESCALA. Os palcos verticais têm 1280px fixos (a largura do
 *      frame do Figma). Em telas menores a página não reflui:
 *      reduz. `--dk-scale` = clientWidth / 1280, no máximo 1.
 *
 *   2. MEDIDA DO PIN. Calcula a escala da timeline, o percurso
 *      horizontal e a altura que a seção precisa ter para caber
 *      esse percurso. Roda no load e no resize — nunca no scroll.
 *
 *   3. PERCURSO. Converte o progresso vertical da seção em
 *      deslocamento horizontal do trilho — mas SÓ onde o CSS não
 *      faz isso sozinho. Em navegador com scroll-driven animations
 *      quem anima é `desktop/pin.css`, no compositor, e este
 *      arquivo nem registra o listener de scroll.
 *
 * O scroll NUNCA é sequestrado. Quem rola continua sendo a
 * página; o script só lê o progresso e escreve um `transform`.
 * É por isso que roda do mouse, trackpad, toque com inércia,
 * teclado e barra de rolagem funcionam sem tratamento especial.
 */
(function () {
  'use strict';

  /* Mesmos números de base/tokens.css (--fig-*). Se um mudar lá,
     mude aqui também. */
  var CANVAS_W = 1280;   // frame "Desktop" · node 1:2
  var TL_W = 5942;       // canvas da timeline · node 2001:3
  var TL_H = 1983;

  var BAND_PAD = 24;     // respiro em volta da faixa de conteúdo
  var MIN_PIN_W = 640;   // abaixo disso o pin não vale a pena
  var URL_BAR_TOL = 140; // variação de altura que é só a barra de URL

  var docEl = document.documentElement;
  var pin = document.querySelector('[data-pin-section]');
  var viewport = pin && pin.querySelector('[data-pin-viewport]');
  var track = pin && pin.querySelector('[data-pin-track]');
  var canvas = pin && pin.querySelector('[data-pin-canvas]');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * O CSS consegue animar o trilho sozinho?
   *
   * `view-timeline` + `animation-range: contain` cobrem o caso
   * inteiro no compositor: zero trabalho na thread principal por
   * quadro, que é o que mantém o scroll liso com um canvas desse
   * tamanho. Onde existe, o caminho JS não entra em cena — nem o
   * listener de scroll é registrado.
   *
   * A condição é a MESMA do `@supports` em desktop/pin.css. Se
   * mudar lá, mude aqui.
   */
  var cssDriven = !!(window.CSS && CSS.supports &&
    CSS.supports('animation-timeline', 'view()') &&
    CSS.supports('animation-range', 'contain'));

  var state = { on: false, distance: 0, stageH: 0, top: 0, travel: 0 };
  var lastW = -1;
  var lastH = -1;
  var lastX = null;
  var near = false;
  var ticking = false;

  /**
   * Faixa vertical realmente ocupada pelo conteúdo do canvas.
   *
   * O frame tem 1983px de altura mas o desenho vive entre ~195 e
   * ~1832 — escalar pela altura cheia desperdiçaria as margens
   * vazias e deixaria a timeline menor do que precisa ser. Medir
   * em vez de fixar mantém isso correto se o desenho mudar.
   *
   * `offsetTop`/`offsetHeight` são valores de layout e ignoram
   * transforms, então medir com o canvas já escalado é seguro.
   */
  function contentBand() {
    var top = Infinity;
    var bottom = -Infinity;
    var nodes = canvas.getElementsByTagName('*');

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      // só os filhos posicionados em relação ao canvas
      if (el.offsetParent !== canvas) continue;
      // os <article>/<header> de cada mês são wrappers semânticos de
      // altura 0 no topo do canvas; entrariam na conta como y=0
      if (el.offsetHeight === 0) continue;
      var t = el.offsetTop;
      var b = t + el.offsetHeight;
      if (t < top) top = t;
      if (b > bottom) bottom = b;
    }

    if (!isFinite(top) || bottom <= top) {
      top = 0;
      bottom = TL_H;
    }

    top = Math.max(0, top - BAND_PAD);
    bottom = Math.min(TL_H, bottom + BAND_PAD);

    return { top: top, height: bottom - top };
  }

  function layout() {
    var vw = docEl.clientWidth;

    docEl.style.setProperty('--dk-scale', String(Math.min(1, vw / CANVAS_W)));

    if (!pin || !viewport || !track || !canvas) return;

    // Liga o pin antes de medir: a altura do sticky vem de 100svh,
    // que não é necessariamente igual a window.innerHeight.
    pin.setAttribute('data-pin', 'on');
    var stageH = viewport.getBoundingClientRect().height;

    var band = contentBand();
    var scale = Math.min(1, stageH / band.height);
    var distance = Math.max(0, TL_W * scale - vw);

    var enable = !reduceMotion.matches && distance > 1 && vw >= MIN_PIN_W;

    docEl.style.setProperty('--tlh-scale', String(scale));
    docEl.style.setProperty(
      '--dk-pin-offset',
      ((stageH - band.height * scale) / 2 - band.top * scale).toFixed(2) + 'px'
    );
    // Alvo do @keyframes em pin.css. Já negativo: o trilho anda
    // para a esquerda.
    docEl.style.setProperty('--dk-pin-distance', (-distance).toFixed(2) + 'px');

    if (enable) {
      pin.style.height = Math.round(stageH + distance) + 'px';
      viewport.tabIndex = -1;          // não é rolável por si só
    } else {
      pin.removeAttribute('data-pin');
      pin.style.height = '';
      viewport.tabIndex = 0;           // volta a ser região rolável
      track.style.transform = '';
      lastX = null;
      docEl.style.setProperty('--dk-pin-x', '0px');
    }

    state.on = enable;
    state.distance = distance;
    state.stageH = stageH;
    // Distância que a seção percorre presa — a mesma do
    // `animation-range: contain 0% contain 100%` do CSS.
    state.travel = enable ? pin.offsetHeight - stageH : 0;
    // Topo da seção em coordenadas de documento. Guardar aqui é o
    // que permite o render() ler só `scrollY`: sem
    // getBoundingClientRect por quadro, sem layout forçado.
    state.top = enable ? pin.getBoundingClientRect().top + window.scrollY : 0;

    // O observer só dispara quando a interseção MUDA. Reaplicar
    // aqui é o que mantém a promoção correta depois de um resize
    // feito com a seção já na tela.
    applyNear();
    render();
  }

  /**
   * `will-change` no trilho: útil durante o percurso, desperdício
   * fora dele. No caminho CSS o compositor cuida da promoção
   * sozinho e o atributo nunca entra.
   */
  function applyNear() {
    if (near && state.on && !cssDriven) pin.setAttribute('data-pin-near', '');
    else pin.removeAttribute('data-pin-near');
  }

  function render() {
    // No caminho CSS quem escreve o transform é o @keyframes.
    if (cssDriven || !state.on || state.travel <= 0) return;

    var progress = (window.scrollY - state.top) / state.travel;
    if (progress < 0) progress = 0;
    else if (progress > 1) progress = 1;

    var x = -(progress * state.distance);
    // Fora do intervalo do pin o progresso satura em 0 ou 1 e o
    // valor repete: escrever de novo só sujaria o style à toa.
    if (x === lastX) return;
    lastX = x;

    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px, 0, 0)';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      render();
    });
  }

  function onResize() {
    var w = docEl.clientWidth;
    var h = window.innerHeight;
    // Em mobile a barra de URL entra e sai mudando só a altura.
    // Refazer o layout no meio do scroll daria solavanco.
    if (w === lastW && Math.abs(h - lastH) < URL_BAR_TOL) return;
    lastW = w;
    lastH = h;
    layout();
  }

  /**
   * Duas coisas que só valem a pena perto da seção.
   *
   * As fotos da timeline nascem `loading="lazy"`, mas dentro do
   * pin elas só entrariam na viewport quando o trilho já as
   * tivesse trazido — carregando e decodificando NO MEIO do
   * percurso, que é exatamente onde um engasgo aparece. Antecipar
   * a carga resolve sem penalizar o carregamento inicial da
   * página: quem está lendo a carta ainda não baixou nada disso.
   *
   * O `will-change` (ver applyNear) segue a mesma lógica: promover
   * o trilho a camada é útil durante o percurso e desperdício fora
   * dele.
   */
  function proximity() {
    if (!pin || !('IntersectionObserver' in window)) return;

    var warmed = false;

    new IntersectionObserver(function (entries) {
      near = entries[0].isIntersecting;

      if (near && !warmed) {
        warmed = true;
        var imgs = track.querySelectorAll('img[loading="lazy"]');
        for (var i = 0; i < imgs.length; i++) imgs[i].loading = 'eager';
      }

      applyNear();
    }, { rootMargin: '150% 0px' }).observe(pin);
  }

  if (!cssDriven) {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', function () {
    lastW = -1;
    onResize();
  });

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', layout);
  }

  layout();
  proximity();
  lastW = docEl.clientWidth;
  lastH = window.innerHeight;

  // A faixa de conteúdo depende das métricas do texto: remedir
  // quando a Poppins terminar de carregar.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  }
})();
