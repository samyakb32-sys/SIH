(function () {
  "use strict";

  var cinema = document.querySelector(".cinema-scroll");
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var track = document.querySelector(".sights-track");
  var sightsControls = document.querySelector(".sights-controls");
  var prevBtn = document.querySelector(".sight-prev");
  var nextBtn = document.querySelector(".sight-next");
  var originalCards = Array.prototype.slice.call(document.querySelectorAll(".sight-card"));

  if (!cinema || !track) return;

  var targetMouseX = 0, targetMouseY = 0, mouseX = 0, mouseY = 0;
  var targetScroll = 0, smoothScroll = 0;
  var initialized = false, rafPending = false;
  var sightCards = [];
  var originalSightCount = originalCards.length;
  var activeSight = originalSightCount;

  function clamp(v, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 1;
    return Math.min(max, Math.max(min, v));
  }
  function smoothstep(e0, e1, v) {
    var x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function segmentInOut(s, a, b, c, d) {
    var enter = smoothstep(a, b, s), exit = smoothstep(c, d, s);
    return { enter: enter, exit: exit, active: enter * (1 - exit) };
  }
  function getScrollDistance() {
    var rect = cinema.getBoundingClientRect();
    return clamp(-rect.top, 0, cinema.offsetHeight - window.innerHeight);
  }

  function setVar(name, value) { root.style.setProperty(name, value); }

  function update() {
    rafPending = false;
    targetScroll = getScrollDistance();

    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

    mouseX = lerp(mouseX, targetMouseX, 0.12);
    mouseY = lerp(mouseY, targetMouseY, 0.12);

    var frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
    var frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
    var progress = clamp(smoothScroll / 2700);
    var introExit = smoothstep(90, 650, smoothScroll);
    var sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
    var sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    var sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
    var blurActive = clamp(frame2.active + frame3.active);
    var frame2Opacity = frame2.active * (1 - frame3.enter);
    var splitDrift = Math.pow(frame2.enter, 1.5);
    var panel2Opacity = frame2.active * (1 - frame2.exit);
    var panel3Opacity = frame3.active * (1 - frame3.exit);
    var backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    var sharedHeroY = progress * -74;
    var sharedHeroScale = progress * 0.23;
    var sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    var sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    var mxUse = reduceMotion.matches ? 0 : mouseX;
    var myUse = reduceMotion.matches ? 0 : mouseY;
    setVar("--mx", mxUse.toFixed(4));
    setVar("--my", myUse.toFixed(4));

    setVar("--back-opacity", (1 - frame2.active * 0.06).toFixed(4));
    setVar("--back-x", (mouseX * -12) + "px");
    setVar("--back-y", (mouseY * -4) + "px");
    setVar("--back-scale", backScale.toFixed(4));
    setVar("--four-y", (10 + progress * 10) + "vh");
    setVar("--four-scale", (0.78 + progress * 0.16).toFixed(4));
    setVar("--bazaar-y", (20 - progress * 8) + "vh");
    setVar("--blur-px", (blurActive * 14).toFixed(2) + "px");
    setVar("--back-brightness", (1 - blurActive * 0.255).toFixed(4));
    setVar("--bazaar-blur-px", (frame2.active * 14).toFixed(2) + "px");
    setVar("--bazaar-brightness", (1 - frame2.active * 0.255 - frame3.active * 0.06).toFixed(4));
    setVar("--bazaar-saturation", (1 + frame3.active * 0.18).toFixed(4));
    setVar("--shade-opacity", "1");
    setVar("--shade-z", blurActive > 0.02 ? "2" : "0");
    setVar("--shade-top-alpha", (blurActive * 0.465).toFixed(4));
    setVar("--shade-mid-alpha", (blurActive * 0.42).toFixed(4));
    setVar("--shade-bottom-alpha", (blurActive * 0.51).toFixed(4));

    setVar("--title-y", (introExit * -210) + "px");
    setVar("--title-scale", (1 - introExit * 0.08).toFixed(4));
    setVar("--title-opacity", (1 - introExit).toFixed(4));

    setVar("--bridge-x", "calc(-50% + " + (mouseX * 18) + "px)");
    setVar("--bridge-y", (mouseY * 8 + sharedHeroY - frame2.exit * 760) + "px");
    setVar("--bridge-bottom", (5 - frame2.enter * 13) + "vh");
    setVar("--bridge-width", (30 + frame2.enter * 16) + "vw");
    setVar("--bridge-scale", (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));

    setVar("--split-left-x", "calc(-50% + " + (-splitDrift * 46) + "vw + " + (mouseX * 22) + "px)");
    setVar("--split-left-y", (mouseY * 10 + sharedHeroY - splitDrift * 180) + "px");
    setVar("--split-left-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
    setVar("--split-right-x", "calc(-50% + " + (splitDrift * 46) + "vw + " + (mouseX * 22) + "px)");
    setVar("--split-right-y", (mouseY * 10 + sharedHeroY - splitDrift * 180) + "px");
    setVar("--split-right-scale", (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));

    setVar("--frame2-opacity", frame2Opacity.toFixed(4));
    setVar("--frame2-x", "calc(-50% + " + (mouseX * 10) + "px)");
    setVar("--frame2-y", "calc(-50% + " + (mouseY * 8 - frame2.exit * 150) + "px)");
    setVar("--frame2-scale", (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));

    setVar("--intro-copy-y", (introExit * 90) + "px");
    setVar("--intro-copy-opacity", (1 - introExit).toFixed(4));
    setVar("--panel2-opacity", panel2Opacity.toFixed(4));
    setVar("--panel2-y", "calc(-50% + " + (-frame2.exit * 86 + (1 - frame2.enter) * 58) + "px)");
    setVar("--panel3-opacity", panel3Opacity.toFixed(4));
    setVar("--panel3-y", "calc(-50% + " + (-frame3.exit * 86 + (1 - frame3.enter) * 58) + "px)");

    setVar("--sights-opacity", sightsEnter.toFixed(4));
    setVar("--sights-controls-opacity", sightsControlsEnter.toFixed(4));
    if (sightsControls) sightsControls.classList.toggle("is-ready", sightsControlsEnter > 0.98);
    setVar("--sights-visibility", sightsEnter > 0.01 ? "visible" : "hidden");
    setVar("--sights-y", "0px");
    setVar("--sights-enter-x", ((1 - sightsEnter) * 420) + "vw");
    setVar("--sights-scale", (1 / backScale).toFixed(4));
    setVar("--sights-top", sightsParentTop.toFixed(2) + "px");
    setVar("--sights-screen-top", sightsScreenTop.toFixed(2) + "px");

    if (
      Math.abs(smoothScroll - targetScroll) > 0.08 ||
      Math.abs(mouseX - targetMouseX) > 0.001 ||
      Math.abs(mouseY - targetMouseY) > 0.001
    ) {
      requestTick();
    }
  }

  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  // ---------- infinite sight-card slider ----------
  function setupSightSlider() {
    if (!originalSightCount) return;
    track.replaceChildren();
    var newCards = [];
    for (var setIndex = 0; setIndex < 3; setIndex++) {
      for (var i = 0; i < originalCards.length; i++) {
        var clone = originalCards[i].cloneNode(true);
        clone.dataset.sightIndex = String(setIndex * originalSightCount + i);
        track.appendChild(clone);
        newCards.push(clone);
      }
    }
    sightCards = newCards;
    activeSight = originalSightCount;

    sightCards.forEach(function (card) {
      card.addEventListener("click", function () { selectSightCard(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectSightCard(card);
        }
      });
    });

    track.addEventListener("transitionend", normalizeSightSlider);
    updateSightSlider();
  }

  function updateSightSlider() {
    if (!sightCards.length) return;
    var cardWidth = sightCards[0].offsetWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    setVar("--sights-shift", (-(cardWidth + gap) * activeSight) + "px");
    sightCards.forEach(function (card) {
      card.classList.toggle("is-active", Number(card.dataset.sightIndex) === activeSight);
    });
  }

  function moveSightSlider(dir) { activeSight += dir; updateSightSlider(); }
  function selectSightCard(card) {
    var idx = Number(card.dataset.sightIndex);
    if (Number.isFinite(idx)) activeSight = idx;
    updateSightSlider();
  }
  function jumpSightSlider(i) {
    track.classList.add("is-jumping");
    activeSight = i;
    updateSightSlider();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { track.classList.remove("is-jumping"); });
    });
  }
  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) jumpSightSlider(activeSight - originalSightCount);
    else if (activeSight < originalSightCount) jumpSightSlider(activeSight + originalSightCount);
  }

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", function () { updateSightSlider(); requestTick(); });
  window.addEventListener("pointermove", function (e) {
    targetMouseX = e.clientX / window.innerWidth - 0.5;
    targetMouseY = e.clientY / window.innerHeight - 0.5;
    requestTick();
  }, { passive: true });

  if (prevBtn) prevBtn.addEventListener("click", function () { moveSightSlider(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { moveSightSlider(1); });

  // script is loaded with `defer`, so the DOM is already parsed by the time this runs
  setupSightSlider();
  requestTick();
})();
