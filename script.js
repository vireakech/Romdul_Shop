/* ==========================================================================
   Romdul — interaction & motion layer
   --------------------------------------------------------------------------
   Pure vanilla JavaScript, no dependencies, loaded with `defer`.
   Everything here is progressive enhancement: with JavaScript disabled the
   pages stay fully readable and every form still works the old way.

   Contents
     1.  Helpers & motion preference
     2.  Scroll progress bar
     3.  Scroll reveal (IntersectionObserver)
     4.  Sticky navbar + mobile navigation
     5.  Back-to-top button
     6.  Toast notifications
     7.  Password field helpers (show/hide, strength, confirm match)
     8.  Inline field validation
     9.  Form submission feedback
     10. Button ripple + loading state
     11. Product / service card tilt + cursor spotlight
     12. Footer year + hash highlight
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* 1. Helpers & motion preference                                      */
  /* ------------------------------------------------------------------ */

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  function reduceMotion() {
    return motionQuery.matches;
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  /* Run a callback at most once per animation frame while scrolling. */
  function onScrollFrame(callback) {
    var scheduled = false;

    return function () {
      if (scheduled) {
        return;
      }
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        callback();
      });
    };
  }

  /* Build an inline SVG eye icon for the password visibility toggle. */
  function eyeIcon(open) {
    var attrs =
      'viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true"';

    if (open) {
      return (
        "<svg " + attrs + "><path d=\"M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 " +
        "6.5S2 12 2 12z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg>"
      );
    }

    return (
      "<svg " + attrs + "><path d=\"M3 3l18 18\"></path>" +
      "<path d=\"M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9\"></path>" +
      "<path d=\"M6.3 7.9A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.6-.7\"></path></svg>"
    );
  }

  /* ------------------------------------------------------------------ */
  /* 2. Scroll progress bar                                              */
  /* ------------------------------------------------------------------ */

  function initScrollProgress() {
    var bar = $(".scroll-progress");

    if (!bar) {
      bar = document.createElement("div");
      bar.className = "scroll-progress";
      bar.setAttribute("aria-hidden", "true");
      document.body.insertBefore(bar, document.body.firstChild);
    }

    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var ratio = max > 0 ? doc.scrollTop / max : 0;
      bar.style.transform =
        "scaleX(" + Math.min(1, Math.max(0, ratio)).toFixed(4) + ")";
    };

    var schedule = onScrollFrame(update);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
  }


  /* ------------------------------------------------------------------ */
  /* 3. Scroll reveal                                                    */
  /* ------------------------------------------------------------------ */

  /* Elements below the fold get a `data-reveal` attribute at runtime, so the
     animation only ever applies once we know JavaScript is running. Anything
     already on screen is left alone, which avoids a flash on first paint. */
  var REVEAL_SELECTOR = [
    ".product-card",
    ".service-card",
    ".process-step",
    ".info-item",
    ".section-divider",
    ".map-frame",
    ".social-row"
  ].join(", ");

  function initReveal() {
    var items = $$("[data-reveal]");

    if (!items.length) {
      items = $$(REVEAL_SELECTOR).filter(function (el) {
        var order = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.setAttribute("data-reveal", "up");
        el.style.setProperty("--reveal-delay", (order % 5) * 90 + "ms");
        return true;
      });
    }

    if (!items.length) {
      return;
    }

    if (reduceMotion() || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    items.forEach(function (el) {
      var box = el.getBoundingClientRect();

      /* Already in view (plus a little slack): show it straight away instead
         of hiding it and waiting for a scroll event to reveal it. */
      if (box.top < window.innerHeight * 0.94) {
        el.classList.add("is-visible");
        return;
      }

      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Sticky navbar + mobile navigation                                */
  /* ------------------------------------------------------------------ */

  function initNavbar() {
    var navbar = $(".navbar");
    var toggle = $("#nav-toggle");
    var label = $(".navbar-toggle");
    var mobileNav = $(".navbar-nav-mobile");

    if (navbar) {
      var reflect = onScrollFrame(function () {
        navbar.classList.toggle("is-scrolled", window.scrollY > 12);
      });

      window.addEventListener("scroll", reflect, { passive: true });
      reflect();
    }

    if (!toggle || !mobileNav) {
      return;
    }

    function sync() {
      var open = toggle.checked;
      mobileNav.classList.toggle("is-open", open);

      if (label) {
        label.classList.toggle("is-active", open);
      }

      document.body.classList.toggle("nav-open", open);
    }

    toggle.addEventListener("change", sync);

    $$(".nav-link", mobileNav).forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.checked = false;
        sync();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.checked) {
        toggle.checked = false;
        sync();
        if (label) {
          label.focus({ preventScroll: true });
        }
      }
    });

    document.addEventListener("click", function (event) {
      if (!toggle.checked || (navbar && navbar.contains(event.target))) {
        return;
      }
      toggle.checked = false;
      sync();
    });

    window.addEventListener("resize", function () {
      if (toggle.checked && window.innerWidth > 768) {
        toggle.checked = false;
        sync();
      }
    });

    sync();
  }

  /* ------------------------------------------------------------------ */
  /* 5. Back-to-top button                                               */
  /* ------------------------------------------------------------------ */

  function initBackToTop() {
    if ($(".to-top")) {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "to-top";
    button.setAttribute("aria-label", "Back to top");
    button.innerHTML =
      '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path></svg>';
    document.body.appendChild(button);

    var reflect = onScrollFrame(function () {
      button.classList.toggle("is-visible", window.scrollY > 520);
    });

    window.addEventListener("scroll", reflect, { passive: true });

    button.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion() ? "auto" : "smooth"
      });
    });

    reflect();
  }

  /* ------------------------------------------------------------------ */
  /* 6. Toast notifications                                              */
  /* ------------------------------------------------------------------ */

  function showToast(message, variant) {
    var host = $(".toast-host");

    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }

    var toast = document.createElement("div");
    toast.className = "toast" + (variant ? " toast-" + variant : "");
    toast.textContent = message;
    host.appendChild(toast);

    window.requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });

    window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 420);
    }, 4200);
  }

  /* ------------------------------------------------------------------ */
  /* 7. Password field helpers                                           */
  /* ------------------------------------------------------------------ */

  function initPasswordToggles() {
    $$("input[type='password']").forEach(function (input) {
      var group = input.closest(".form-group");

      if (!group || group.classList.contains("has-password-toggle")) {
        return;
      }

      group.classList.add("has-password-toggle");

      /* Wrap the input so the toggle can be positioned inside the field. */
      var wrapper = document.createElement("div");
      wrapper.className = "field-control";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "password-toggle";
      button.setAttribute("aria-label", "Show password");
      button.innerHTML = eyeIcon(false);

      button.addEventListener("click", function () {
        var revealed = input.type === "text";
        input.type = revealed ? "password" : "text";
        button.classList.toggle("is-revealed", !revealed);
        button.innerHTML = eyeIcon(!revealed);
        button.setAttribute(
          "aria-label",
          revealed ? "Show password" : "Hide password"
        );
        input.focus({ preventScroll: true });
      });

      wrapper.appendChild(button);
    });
  }

  /* A four-step strength meter for the registration password. */
  function initStrengthMeter() {
    var input = $("#register-password");
    var group = input ? input.closest(".form-group") : null;

    if (!group) {
      return;
    }

    var labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
    var meter = document.createElement("div");
    meter.className = "strength";
    meter.innerHTML =
      '<span class="strength-track"><span class="strength-fill"></span></span>' +
      '<span class="strength-label" aria-live="polite"></span>';
    group.appendChild(meter);

    var label = $(".strength-label", meter);

    function score(value) {
      if (value.length < 8) {
        return 0;
      }
      var total = 1;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
        total += 1;
      }
      if (/\d/.test(value)) {
        total += 1;
      }
      if (/[^A-Za-z0-9]/.test(value)) {
        total += 1;
      }
      return total;
    }

    function update() {
      var value = input.value;

      if (!value) {
        meter.classList.remove("is-visible");
        meter.removeAttribute("data-level");
        label.textContent = "";
        return;
      }

      var level = score(value);
      meter.classList.add("is-visible");
      meter.setAttribute("data-level", String(level));
      label.textContent = labels[level];
    }

    input.addEventListener("input", update);
    update();
  }

  /* Keep "confirm password" in step with the password field. */
  function initConfirmMatch() {
    var password = $("#register-password");
    var confirm = $("#register-confirm");

    if (!password || !confirm) {
      return;
    }

    function check() {
      var mismatch = confirm.value.length > 0 && confirm.value !== password.value;
      setFieldMessage(confirm, mismatch ? "Passwords do not match." : "");
    }

    confirm.addEventListener("input", check);
    confirm.addEventListener("blur", check);
    password.addEventListener("input", function () {
      if (confirm.value.length > 0) {
        check();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Inline field validation                                          */
  /* ------------------------------------------------------------------ */

  /* Show or clear an error under a single field. Checkboxes live outside a
     .form-group, so their message is attached to the surrounding form. */
  function setFieldMessage(field, message) {
    var group = field.closest(".form-group");
    var options = field.closest(".form-options");
    var marked = group || options;
    var host = group || (options ? options.parentNode : field.parentNode);
    var key = field.id || field.name || "field";
    var note = $('.field-note[data-for="' + key + '"]', host);

    if (!message) {
      if (marked) {
        marked.classList.remove("has-error");
      }
      if (note) {
        note.parentNode.removeChild(note);
      }
      return;
    }

    if (marked) {
      marked.classList.add("has-error");
    }

    if (!note) {
      note = document.createElement("span");
      note.className = "field-note";
      note.setAttribute("data-for", key);
      host.appendChild(note);
    }

    note.textContent = message;

    /* Re-trigger the little slide-in every time the message changes. */
    note.classList.remove("is-fresh");
    void note.offsetWidth;
    note.classList.add("is-fresh");
  }

  /* Returns an error string for a field, or "" when it is valid. */
  function messageFor(field) {
    var value = (field.value || "").trim();

    if (field.type === "checkbox") {
      if (field.required && !field.checked) {
        return "Please accept the terms to continue.";
      }
      return "";
    }

    if (field.tagName === "SELECT" && field.required && !value) {
      return "Please choose an option.";
    }

    if (field.required && !value) {
      return "This field is required.";
    }

    if (field.type === "email" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "Enter a valid email address, like you@example.com.";
      }
    }

    if (field.minLength > 0 && value && value.length < field.minLength) {
      return "Use at least " + field.minLength + " characters.";
    }

    return "";
  }

  /* ------------------------------------------------------------------ */
  /* 9. Form submission feedback                                         */
  /* ------------------------------------------------------------------ */

  function initForms() {
    $$("form").forEach(function (form) {
      var fields = $$("input, select, textarea", form);
      var status = $(".form-status", form);

      /* Reuse the existing .form-status style, creating it when absent. */
      if (!status) {
        status = document.createElement("p");
        status.className = "form-status";
        status.setAttribute("role", "status");
        form.appendChild(status);
      }

      fields.forEach(function (field) {
        if (field.type === "hidden" || field.type === "submit") {
          return;
        }

        field.addEventListener("blur", function () {
          setFieldMessage(field, messageFor(field));
        });

        field.addEventListener("input", function () {
          var group = field.closest(".form-group");
          var options = field.closest(".form-options");

          if (
            (group && group.classList.contains("has-error")) ||
            (options && options.classList.contains("has-error"))
          ) {
            setFieldMessage(field, messageFor(field));
          }
        });

        if (field.tagName === "SELECT") {
          field.addEventListener("change", function () {
            setFieldMessage(field, messageFor(field));
          });
        }
      });

      form.addEventListener("submit", function (event) {
        var firstInvalid = null;

        fields.forEach(function (field) {
          var message = field.disabled ? "" : messageFor(field);
          setFieldMessage(field, message);

          if (message && !firstInvalid) {
            firstInvalid = field;
          }
        });

        /* Real client-side blocking: stop the submit and point at the problem. */
        if (firstInvalid) {
          event.preventDefault();
          form.classList.remove("is-shaking");
          void form.offsetWidth;
          form.classList.add("is-shaking");
          window.setTimeout(function () {
            form.classList.remove("is-shaking");
          }, 640);
          showToast("Please fix the highlighted fields.", "error");
          firstInvalid.focus({ preventScroll: true });
          firstInvalid.scrollIntoView({
            block: "center",
            behavior: reduceMotion() ? "auto" : "smooth"
          });
          return;
        }

        /* The forms point at /login, /register and /contact, but this is a
           static site with no server behind it, so we confirm locally instead
           of letting the browser navigate to a 404. */
        event.preventDefault();

        var button = $("button[type='submit']", form);
        var action = form.getAttribute("action") || "";
        var name =
          action.indexOf("register") > -1
            ? "Registration"
            : action.indexOf("login") > -1
              ? "Login"
              : "Message";

        if (button) {
          button.classList.add("is-loading");
        }

        window.setTimeout(function () {
          if (button) {
            button.classList.remove("is-loading");
          }

          status.textContent =
            name +
            " details validated. This static demo has no server attached, so " +
            "nothing was sent — connect the form action to a real endpoint to " +
            "go live.";
          status.classList.add("is-visible");

          showToast(name + " validated — no backend connected yet.", "success");
        }, 620);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 10. Button ripple + loading state                                   */
  /* ------------------------------------------------------------------ */

  function initRipple() {
    if (reduceMotion()) {
      return;
    }

    $$(".btn").forEach(function (button) {
      if (button.classList.contains("has-ripple")) {
        return;
      }

      button.classList.add("has-ripple");

      button.addEventListener("click", function (event) {
        var rect = button.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 2.2;
        /* Keyboard activation reports clientX/clientY as 0 — ripple from the
           middle of the button in that case. */
        var x = event.clientX || rect.left + rect.width / 2;
        var y = event.clientY || rect.top + rect.height / 2;
        var ripple = document.createElement("span");

        ripple.className = "ripple";
        ripple.style.width = size + "px";
        ripple.style.height = size + "px";
        ripple.style.left = x - rect.left - size / 2 + "px";
        ripple.style.top = y - rect.top - size / 2 + "px";
        button.appendChild(ripple);

        window.setTimeout(function () {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 720);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 11. Card tilt + cursor spotlight                                    */
  /* ------------------------------------------------------------------ */

  function initCardTilt() {
    if (reduceMotion() || !hoverQuery.matches) {
      return;
    }

    $$(".product-card, .service-card").forEach(function (card) {
      var pointer = { x: 0, y: 0 };

      card.classList.add("is-tiltable");

      /* Throttled to one update per frame so moving the mouse stays cheap. */
      var apply = onScrollFrame(function () {
        var rect = card.getBoundingClientRect();
        var px = (pointer.x - rect.left) / rect.width;
        var py = (pointer.y - rect.top) / rect.height;

        card.style.setProperty("--glow-x", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--glow-y", (py * 100).toFixed(1) + "%");
        card.style.setProperty("--tilt-y", ((px - 0.5) * 6).toFixed(2) + "deg");
        card.style.setProperty("--tilt-x", ((0.5 - py) * 6).toFixed(2) + "deg");
      });

      card.addEventListener("mousemove", function (event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        apply();
      });

      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 12. Footer year + in-page highlight                                 */
  /* ------------------------------------------------------------------ */

  function initFooterYear() {
    var copyright = $(".footer-copyright");

    if (!copyright) {
      return;
    }

    copyright.innerHTML = copyright.innerHTML.replace(
      /\b(19|20)\d{2}\b/,
      String(new Date().getFullYear())
    );
  }

  /* Flash the card when arriving via a #login-card / #register-card link. */
  function initHashHighlight() {
    function highlight() {
      var id = window.location.hash.replace("#", "");

      if (!id) {
        return;
      }

      var target = document.getElementById(id);

      if (!target) {
        return;
      }

      target.classList.remove("is-highlighted");
      void target.offsetWidth;
      target.classList.add("is-highlighted");

      window.setTimeout(function () {
        target.classList.remove("is-highlighted");
      }, 2400);
    }

    window.addEventListener("hashchange", highlight);

    if (window.location.hash) {
      window.setTimeout(highlight, 300);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                           */
  /* ------------------------------------------------------------------ */

  function boot() {
    initScrollProgress();
    initReveal();
    initNavbar();
    initBackToTop();
    initPasswordToggles();
    initStrengthMeter();
    initConfirmMatch();
    initForms();
    initRipple();
    initCardTilt();
    initFooterYear();
    initHashHighlight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

