/* Vitrine Software — interações da vitrine */
(function () {
  "use strict";

  // --- Header: sombra ao rolar ---
  var header = document.getElementById("header");
  var onScroll = function () {
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // --- Menu mobile ---
  var burger = document.getElementById("burger");
  var nav = document.getElementById("mobileNav");
  var scrim = document.getElementById("scrim");
  var closeNav = document.getElementById("closeNav");
  function openMenu() { nav.classList.add("open"); scrim.classList.add("open"); document.body.style.overflow = "hidden"; }
  function shutMenu() { nav.classList.remove("open"); scrim.classList.remove("open"); document.body.style.overflow = ""; }
  burger.addEventListener("click", openMenu);
  closeNav.addEventListener("click", shutMenu);
  scrim.addEventListener("click", shutMenu);
  nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", shutMenu); });

  // --- Reveal on scroll ---
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // --- Contadores animados ---
  var counters = document.querySelectorAll("[data-count]");
  function animate(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var start = 0, dur = 1400, t0 = null;
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(start + (target - start) * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animate(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // --- Formulário (demo, sem backend) ---
  var form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = form.querySelector("#email");
      var nome = form.querySelector("#nome");
      if (!nome.value.trim() || !email.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
        (nome.value.trim() ? email : nome).focus();
        return;
      }
      document.getElementById("formFields").style.display = "none";
      document.getElementById("formOk").classList.add("show");
    });
  }

  // --- Ano dinâmico no rodapé ---
  var y = new Date().getFullYear();
  document.querySelectorAll(".footer-bottom span").forEach(function (s) {
    s.innerHTML = s.innerHTML.replace("2026", y);
  });
})();
