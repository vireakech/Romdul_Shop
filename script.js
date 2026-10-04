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
     13. Shop: catalogue, cart, product page & checkout
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
    ".social-row",
    ".home-split",
    ".home-card",
    ".home-cta"
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

    if (field.type === "tel" && value) {
      if (!/^[0-9+() -]{7,20}$/.test(value)) {
        return "Enter a valid phone number, like +855 12 345 678.";
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

      /* Forms that run their own submit flow (the checkout) opt out here. */
      form.addEventListener("submit", function (event) {
        if (form.hasAttribute("data-custom-submit")) {
          return;
        }

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
  /* 14. Profile — phone-number dialog                                   */
  /* ------------------------------------------------------------------ */

  var PROFILE_KEY = "romdul-profile-v1";

  var PROFILE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true">' +
    '<circle cx="12" cy="8" r="3.6"></circle>' +
    '<path d="M4.5 20a7.5 7.5 0 0 1 15 0"></path>' +
    "</svg>";

  /* The saved profile is a tiny { name, phone } object in localStorage. */
  function readProfile() {
    try {
      var raw = window.localStorage.getItem(PROFILE_KEY);
      var data = raw ? JSON.parse(raw) : null;

      return data && typeof data === "object" ? data : null;
    } catch (error) {
      return null;
    }
  }

  function writeProfile(profile) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      /* Private mode: the profile just will not survive a reload. */
    }

    refreshProfileBadges();
  }

  /* A small gold dot shows when a phone number is already saved. */
  function refreshProfileBadges() {
    var saved = readProfile();
    var hasPhone = !!(saved && saved.phone);

    $$(".navbar-profile").forEach(function (button) {
      button.classList.toggle("has-profile", hasPhone);
      button.setAttribute(
        "aria-label",
        hasPhone ? "Open profile, phone number saved" : "Open profile"
      );
    });
  }

  /* Put a round profile button in the navbar on every page. */
  function initNavProfile() {
    var container = $(".navbar-container");

    if (container && !$(".navbar-profile", container)) {
      var button = document.createElement("button");
      var toggle = $(".navbar-toggle", container);

      button.type = "button";
      button.className = "navbar-profile";
      button.setAttribute("aria-label", "Open profile");
      button.setAttribute("aria-haspopup", "dialog");
      button.innerHTML =
        PROFILE_ICON + '<span class="navbar-profile-dot"></span>';

      container.insertBefore(button, toggle || null);
    }

    refreshProfileBadges();
  }

  /* The dialog is built here, once, so every page's markup stays unchanged. */
  function initProfilePanel() {
    if ($("#profile-overlay")) {
      return;
    }

    var overlay = document.createElement("div");

    overlay.className = "profile-overlay";
    overlay.id = "profile-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="profile-backdrop" data-profile-close></div>' +
      '<div class="profile-modal" role="dialog" aria-modal="true" ' +
      'aria-labelledby="profile-title">' +
      '<button type="button" class="profile-close" data-profile-close ' +
      'aria-label="Close profile">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>' +
      "</button>" +
      '<div class="profile-head">' +
      '<span class="profile-avatar" aria-hidden="true">' +
      PROFILE_ICON +
      "</span>" +
      '<div><p class="profile-eyebrow">Your account</p>' +
      '<h2 id="profile-title">Profile</h2></div>' +
      "</div>" +
      '<p class="profile-lead">Add your phone number and our team in Phnom ' +
      "Penh can reach you about orders, commissions and repairs.</p>" +
      '<form class="auth-form profile-form" action="/profile" method="POST" ' +
      "data-custom-submit novalidate>" +
      '<div class="form-group">' +
      '<label for="profile-phone">Phone Number</label>' +
      '<input type="tel" id="profile-phone" name="phone" ' +
      'placeholder="+855 12 345 678" required autocomplete="tel" ' +
      'inputmode="tel">' +
      "</div>" +
      '<div class="form-group">' +
      '<label for="profile-name">Full Name ' +
      '<span class="field-hint">(optional)</span></label>' +
      '<input type="text" id="profile-name" name="name" ' +
      'placeholder="Sok Dara" autocomplete="name">' +
      "</div>" +
      '<button type="submit" class="btn btn-primary btn-block">' +
      "Save phone number</button>" +
      "</form>" +
      '<div class="profile-success" hidden>' +
      '<span class="profile-check" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 12.5l5.2 5.2L20 7"></path></svg></span>' +
      "<p>Phone number saved</p>" +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    var form = $(".profile-form", overlay);
    var success = $(".profile-success", overlay);
    var phone = $("#profile-phone", overlay);
    var name = $("#profile-name", overlay);
    var lastFocus = null;
    var closeTimer = 0;

    /* Pre-fill from the saved profile each time the dialog opens. */
    function fill() {
      var data = readProfile() || {};

      if (phone) {
        phone.value = data.phone || "";
      }
      if (name) {
        name.value = data.name || "";
      }
      if (form) {
        form.hidden = false;
      }
      if (success) {
        success.hidden = true;
      }
    }

    function open(trigger) {
      lastFocus = trigger || document.activeElement;
      fill();

      overlay.hidden = false;
      document.body.classList.add("profile-open");

      /* Force a reflow so the entrance transition always plays. */
      void overlay.offsetWidth;
      overlay.classList.add("is-open");

      window.setTimeout(
        function () {
          if (phone) {
            phone.focus({ preventScroll: true });
          }
        },
        reduceMotion() ? 0 : 260
      );
    }

    function close() {
      window.clearTimeout(closeTimer);
      overlay.classList.remove("is-open");
      document.body.classList.remove("profile-open");

      function finish() {
        overlay.hidden = true;
      }

      if (reduceMotion()) {
        finish();
      } else {
        closeTimer = window.setTimeout(finish, 380);
      }

      /* Hand focus back to whatever opened the dialog. */
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
      lastFocus = null;
    }

    /* Any element can open the dialog: the navbar button, or a
       [data-profile-open] trigger such as the home-page call to action. */
    document.addEventListener("click", function (event) {
      var opener = event.target.closest("[data-profile-open], .navbar-profile");

      if (!opener) {
        return;
      }

      event.preventDefault();

      if (overlay.hidden) {
        open(opener);
      } else {
        close();
      }
    });

    overlay.addEventListener("click", function (event) {
      if (event.target.closest("[data-profile-close]")) {
        close();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) {
        close();
      }
    });

    /* Saving validates the phone number, stores it, plays the tick
       animation and then closes the dialog. */
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var message = phone ? messageFor(phone) : "";

        if (phone) {
          setFieldMessage(phone, message);
        }

        if (message) {
          form.classList.remove("is-shaking");
          void form.offsetWidth;
          form.classList.add("is-shaking");
          window.setTimeout(function () {
            form.classList.remove("is-shaking");
          }, 640);
          showToast("Please enter a valid phone number.", "error");

          if (phone) {
            phone.focus({ preventScroll: true });
          }
          return;
        }

        writeProfile({
          phone: phone ? phone.value.trim() : "",
          name: name ? name.value.trim() : ""
        });

        form.hidden = true;

        if (success) {
          success.hidden = false;
        }

        showToast("Phone number saved to your profile.", "success");

        window.setTimeout(function () {
          if (!overlay.hidden) {
            close();
          }
        }, 1150);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                           */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* 13. Shop — catalogue, cart, product page & checkout                 */
  /* ------------------------------------------------------------------ */

  /* The whole catalogue lives in one place. The product page reads it by
     slug (?id=…), the catalogue cards look their product up by image file
     name, and the cart / checkout pages share the same prices. */
  var PRODUCTS = {
    "tro-sau": {
      short: "Tro Sau",
      km: "ត្រសៅ",
      en: "Tro Sau — Two-String Fiddle",
      price: 120,
      image: "tro.png",
      alt: "Tro Sau — traditional Khmer two-string fiddle",
      stock: "In stock",
      desc: "A vertically held two-string fiddle with a coconut-shell resonator covered in goat skin. Used in folk and classical ensembles for expressive melodies.",
      highlights: [
        "Coconut-shell resonator with a goat-skin soundboard",
        "Hand-carved hardwood neck, pegs and bridge",
        "Supplied with a bow and padded carry case"
      ]
    },
    "roneat-ek": {
      short: "Roneat Ek",
      km: "រនាតឯក",
      en: "Roneat Ek — Large Gong Xylophone",
      price: 450,
      image: "roneat.png",
      alt: "Roneat Ek — traditional Khmer gong xylophone",
      stock: "In stock",
      desc: "A high-pitched bamboo and gong xylophone, the lead melodic instrument of the pinpeat orchestra. Hand-carved bars with gilded bronze keys.",
      highlights: [
        "Hand-tuned bronze keys on a carved bamboo frame",
        "Gilded finish with traditional Khmer motifs",
        "Includes a pair of wooden mallets"
      ]
    },
    "skor-thom": {
      short: "Skor Thom",
      km: "ស្កុរធំ",
      en: "Skor Thom — Large Double-Headed Drum",
      price: 280,
      image: "sko.png",
      alt: "Skor Thom — large traditional Khmer drum",
      stock: "In stock",
      desc: "A deep, resonant barrel drum played with the hands, providing the rhythmic foundation of classical Khmer music. Made from carved hardwood and cowhide.",
      highlights: [
        "Carved hardwood barrel with cowhide heads",
        "Rope-tensioned tuning system",
        "Includes two drum beaters"
      ]
    },
    "khim": {
      short: "Khim",
      km: "ខឹម",
      en: "Khim — Hammered Dulcimer",
      price: 310,
      image: "khem.png",
      alt: "Khim — traditional Khmer hammered dulcimer",
      stock: "2 left",
      desc: "A trapezoidal box strung with metal courses and struck with light bamboo hammers, prized for its bright, cascading tone in modern Khmer ensembles.",
      highlights: [
        "Trapezoidal soundbox strung with metal courses",
        "Supplied with light bamboo hammers",
        "Tuned to a Khmer classical scale"
      ]
    },
    "kong-vong": {
      short: "Kong Vong",
      km: "គងវ៉ភ្នំ",
      en: "Kong Vong — Circular Gong Chimes",
      price: 380,
      image: "kongvong.png",
      alt: "Kong Vong — circular Khmer gong chime",
      stock: "In stock",
      desc: "A circular rack of 12 to 14 tuned gongs, struck with padded mallets. A central part of the pinpeat ensemble, providing shimmering harmonic accompaniment.",
      highlights: [
        "12 tuned bronze gongs on a carved circular frame",
        "Includes padded mallets",
        "Available in lead and accompaniment sizes"
      ]
    },
    "chapei": {
      short: "Chapei Dong Veng",
      km: "ចាប៉ីដងវែង",
      en: "Chapei Dong Veng — Long-Neck Lute",
      price: 180,
      image: "chapey.jpg",
      alt: "Chapei Dong Veng — long-necked Khmer lute",
      stock: "In stock",
      desc: "A two-string plucked lute with a long fretted neck, traditionally used to accompany sung poetry and storytelling. Carved from a single piece of hardwood.",
      highlights: [
        "Carved from a single piece of hardwood",
        "Long fretted neck tuned for sung poetry",
        "Two strings with traditional friction pegs"
      ]
    },
    "sralai": {
      short: "Sralai",
      km: "ស្រឡៃ",
      en: "Sralai — Quadruple-Reed Oboe",
      price: 95,
      image: "trsav.png",
      alt: "Sralai — traditional Khmer oboe",
      stock: "In stock",
      desc: "A conical hardwood oboe with a piercing, nasal tone that carries the melodic line of the pinpeat ensemble over the gongs and drums.",
      highlights: [
        "Conical hardwood body with a quadruple reed",
        "Replacement reeds supplied with every order",
        "Protective carry tube included"
      ]
    },
    "pin": {
      short: "Pin",
      km: "ពិណ",
      en: "Pin — Arched Harp",
      price: 260,
      image: "pin.png",
      alt: "Pin — ancient Khmer arched harp",
      stock: "Made to order",
      desc: "An ancient arched harp with a boat-shaped resonator, revived from Angkorian bas-reliefs. A rare centrepiece for collectors and classical ensembles.",
      highlights: [
        "Boat-shaped resonator revived from Angkorian reliefs",
        "Hand-finished with natural lacquer",
        "Made to order in four to six weeks"
      ]
    }
  };

  var CART_KEY = "romdul-cart-v1";
  var FREE_SHIPPING_FROM = 200;
  var SHIPPING_FEE = 25;

  function money(value) {
    return "$" + Number(value).toLocaleString("en-US");
  }

  function setText(selector, value) {
    var el = $(selector);

    if (el) {
      el.textContent = value;
    }
  }

  /* Read a value out of the query string, e.g. ?id=khim */
  function queryParam(name) {
    var match = new RegExp("[?&]" + name + "=([^&]*)").exec(
      window.location.search
    );

    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  /* Quantities are always whole numbers between 1 and 99. */
  function clampQty(value) {
    var number = parseInt(value, 10);

    if (isNaN(number)) {
      number = 1;
    }

    return Math.min(99, Math.max(1, number));
  }

  /* ------------------------------------------------------------------ */
  /* Cart storage — a tiny slug → quantity map in localStorage           */
  /* ------------------------------------------------------------------ */

  function readCart() {
    try {
      var raw = window.localStorage.getItem(CART_KEY);
      var data = raw ? JSON.parse(raw) : null;

      return data && typeof data === "object" ? data : {};
    } catch (error) {
      return {};
    }
  }

  function writeCart(cart) {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      /* Private mode or a full quota: the page still works, the cart just
         will not survive a page reload. */
    }

    refreshCartBadges(cart);
  }

  function cartSlugs(cart) {
    return Object.keys(cart).filter(function (slug) {
      return PRODUCTS[slug] && cart[slug] > 0;
    });
  }

  function cartCount(cart) {
    return cartSlugs(cart).reduce(function (total, slug) {
      return total + cart[slug];
    }, 0);
  }

  function cartSubtotal(cart) {
    return cartSlugs(cart).reduce(function (total, slug) {
      return total + PRODUCTS[slug].price * cart[slug];
    }, 0);
  }

  /* Shipping is free over $200, otherwise a flat fee. */
  function shippingFor(subtotal) {
    if (subtotal <= 0) {
      return 0;
    }

    return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  }

  function addToCart(slug, qty) {
    if (!PRODUCTS[slug]) {
      return 0;
    }

    var cart = readCart();
    cart[slug] = (cart[slug] || 0) + (qty > 0 ? qty : 1);
    writeCart(cart);
    return cart[slug];
  }

  function setCartQty(slug, qty) {
    var cart = readCart();

    if (qty > 0) {
      cart[slug] = qty;
    } else {
      delete cart[slug];
    }

    writeCart(cart);
  }

  function removeFromCart(slug) {
    var cart = readCart();
    delete cart[slug];
    writeCart(cart);
  }

  var CART_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true">' +
    '<circle cx="9" cy="20" r="1.4"></circle>' +
    '<circle cx="18" cy="20" r="1.4"></circle>' +
    '<path d="M2 3h3l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6"></path>' +
    "</svg>";

  /* Keep every cart badge on the page in step with the stored cart. */
  function refreshCartBadges(cart) {
    var count = cartCount(cart || readCart());

    $$(".navbar-cart").forEach(function (link) {
      var badge = $(".navbar-cart-count", link);

      if (badge) {
        badge.textContent = count > 99 ? "99+" : String(count);
      }

      link.classList.toggle("has-items", count > 0);
      link.setAttribute(
        "aria-label",
        count > 0
          ? "View cart, " + count + (count === 1 ? " item" : " items")
          : "View cart"
      );
    });
  }

  /* Put a cart button in the navbar on every page, so the running total is
     always visible. Kept in JS so each page's markup stays unchanged. */
  function initNavCart() {
    var container = $(".navbar-container");

    if (container && !$(".navbar-cart", container)) {
      var link = document.createElement("a");
      var toggle = $(".navbar-toggle", container);

      link.className = "navbar-cart";
      link.href = "cart.html";
      link.setAttribute("aria-label", "View cart");
      link.innerHTML = CART_ICON + '<span class="navbar-cart-count">0</span>';

      container.insertBefore(link, toggle || null);
    }

    refreshCartBadges(readCart());
  }

  /* Match a catalogue photo back to its product slug. */
  function slugForImage(src) {
    if (!src) {
      return "";
    }

    var file = src.split("/").pop().split("?")[0];
    var found = "";

    Object.keys(PRODUCTS).some(function (slug) {
      if (PRODUCTS[slug].image === file) {
        found = slug;
        return true;
      }
      return false;
    });

    return found;
  }

  /* Make every instrument card clickable (a stretched link to its product
     page) and add a one-click "add to cart" button underneath. */
  function initProductCards() {
    var cards = $$(".product-card");

    if (!cards.length) {
      return;
    }

    cards.forEach(function (card) {
      if (card.classList.contains("has-link")) {
        return;
      }

      var image = $(".product-image", card);
      var slug = slugForImage(image ? image.getAttribute("src") : "");

      if (!slug) {
        return;
      }

      var product = PRODUCTS[slug];
      card.classList.add("has-link");

      var link = document.createElement("a");
      link.className = "product-card-link";
      link.href = "product.html?id=" + slug;
      link.setAttribute("aria-label", "View " + product.en + " details");
      card.insertBefore(link, card.firstChild);

      var actions = document.createElement("div");
      actions.className = "product-card-actions";

      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-small btn-primary";
      button.setAttribute("data-add-to-cart", slug);
      button.textContent = "Add to cart";
      actions.appendChild(button);
      card.appendChild(actions);

      button.addEventListener("click", function () {
        addToCart(slug, 1);
        showToast(product.short + " added to your cart.", "success");

        button.textContent = "Added ✓";
        button.classList.add("is-added");

        window.setTimeout(function () {
          button.textContent = "Add to cart";
          button.classList.remove("is-added");
        }, 1500);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Product detail page (product.html?id=…)                             */
  /* ------------------------------------------------------------------ */

  function initProductDetail() {
    var root = $("[data-product-detail]");

    if (!root) {
      return;
    }

    var slug =
      queryParam("id") || root.getAttribute("data-default-product") || "tro-sau";
    var product = PRODUCTS[slug] || null;
    var body = $("#pd-body");
    var missing = $("#pd-missing");
    var input = $("#pd-qty");

    if (!product) {
      if (missing) {
        missing.hidden = false;
      }
      if (body) {
        body.hidden = true;
      }
      return;
    }

    document.title = product.en + " — Romdul";

    var image = $("#pd-image");
    if (image) {
      image.src = product.image;
      image.alt = product.alt;
    }

    setText("[data-pd-crumb]", product.en);
    setText("[data-pd-km]", product.km);
    setText("[data-pd-en]", product.en);
    setText("[data-pd-price]", money(product.price));
    setText("[data-pd-stock]", product.stock);
    setText("[data-pd-desc]", product.desc);

    var highlights = $("#pd-highlights");
    if (highlights) {
      highlights.innerHTML = "";
      product.highlights.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        highlights.appendChild(li);
      });
    }

    /* Redraw the running total whenever the quantity changes. */
    function syncTotal() {
      if (!input) {
        return;
      }

      var qty = clampQty(input.value);
      input.value = qty;

      setText("[data-pd-total]", money(product.price * qty));

      var buy = $("#pd-buy");
      if (buy) {
        buy.textContent = "Buy now — " + money(product.price * qty);
      }
    }

    if (input) {
      $$("[data-qty-step]", root).forEach(function (button) {
        button.addEventListener("click", function () {
          var step = parseInt(button.getAttribute("data-qty-step"), 10);
          input.value = clampQty(input.value) + step;
          syncTotal();
        });
      });

      input.addEventListener("input", syncTotal);
      input.addEventListener("change", syncTotal);
      input.addEventListener("blur", syncTotal);
    }

    var add = $("#pd-add");
    if (add) {
      add.addEventListener("click", function () {
        var qty = clampQty(input ? input.value : 1);
        addToCart(slug, qty);
        showToast(qty + " × " + product.short + " added to your cart.", "success");
      });
    }

    var buy = $("#pd-buy");
    if (buy) {
      buy.addEventListener("click", function () {
        addToCart(slug, clampQty(input ? input.value : 1));
        window.location.href = "cart.html";
      });
    }

    syncTotal();
    refreshCartBadges(readCart());
  }

  /* ------------------------------------------------------------------ */
  /* Cart & checkout page (cart.html)                                    */
  /* ------------------------------------------------------------------ */

  function initCartPage() {
    var root = $("[data-cart-page]");

    if (!root) {
      return;
    }

    var itemsHost = $("#cart-items");
    var emptyState = $("#cart-empty");
    var layout = $("#cart-layout");
    var confirmation = $("#order-confirmation");

    function renderItems(cart) {
      var slugs = cartSlugs(cart);
      var subtotal = cartSubtotal(cart);
      var shipping = shippingFor(subtotal);
      var shippingLabel = "—";

      if (subtotal > 0) {
        shippingLabel = shipping > 0 ? money(shipping) : "Free";
      }

      setText("#sum-count", String(cartCount(cart)));
      setText("#sum-subtotal", money(subtotal));
      setText("#sum-shipping", shippingLabel);
      setText("#sum-total", money(subtotal + shipping));

      if (!slugs.length) {
        if (emptyState) {
          emptyState.hidden = false;
        }
        if (layout) {
          layout.hidden = true;
        }
        refreshCartBadges(cart);
        return;
      }

      if (emptyState) {
        emptyState.hidden = true;
      }
      if (layout) {
        layout.hidden = false;
      }

      itemsHost.innerHTML = "";

      slugs.forEach(function (slug) {
        var product = PRODUCTS[slug];
        var qty = cart[slug];
        var row = document.createElement("article");

        row.className = "cart-item";
        row.innerHTML =
          '<div class="cart-item-media">' +
          '<img src="' + product.image + '" alt="' + product.alt + '" loading="lazy">' +
          "</div>" +
          '<div class="cart-item-body">' +
          '<div class="cart-item-name-km">' + product.km + "</div>" +
          '<a class="cart-item-name-en" href="product.html?id=' + slug + '">' +
          product.en +
          "</a>" +
          '<div class="cart-item-price">' + money(product.price) + " each</div>" +
          "</div>" +
          '<div class="cart-item-controls">' +
          '<div class="quantity-stepper quantity-stepper-small">' +
          '<button type="button" class="qty-btn" data-cart-step="-1" data-slug="' + slug + '" aria-label="Decrease ' + product.short + ' quantity">−</button>' +
          '<input class="qty-input" type="number" min="1" max="99" step="1" value="' + qty + '" data-cart-qty data-slug="' + slug + '" aria-label="' + product.short + ' quantity">' +
          '<button type="button" class="qty-btn" data-cart-step="1" data-slug="' + slug + '" aria-label="Increase ' + product.short + ' quantity">+</button>' +
          "</div>" +
          '<div class="cart-item-total">' + money(product.price * qty) + "</div>" +
          '<button type="button" class="cart-item-remove" data-cart-remove data-slug="' + slug + '">Remove</button>' +
          "</div>";

        itemsHost.appendChild(row);
      });

      refreshCartBadges(cart);
    }

    function render() {
      renderItems(readCart());
    }

    if (itemsHost) {
      itemsHost.addEventListener("click", function (event) {
        var step = event.target.closest("[data-cart-step]");
        var remove = event.target.closest("[data-cart-remove]");

        if (step) {
          var stepSlug = step.getAttribute("data-slug");
          var field = $('[data-cart-qty][data-slug="' + stepSlug + '"]', itemsHost);
          var next =
            clampQty(field ? field.value : 1) +
            parseInt(step.getAttribute("data-cart-step"), 10);

          setCartQty(stepSlug, next);
          render();
        } else if (remove) {
          removeFromCart(remove.getAttribute("data-slug"));
          showToast("Item removed from your cart.", "success");
          render();
        }
      });

      itemsHost.addEventListener("change", function (event) {
        var field = event.target.closest("[data-cart-qty]");

        if (!field) {
          return;
        }

        setCartQty(field.getAttribute("data-slug"), clampQty(field.value));
        render();
      });
    }

    var form = $("#checkout-form");

    if (!form) {
      render();
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var fields = $$("input, select, textarea", form);
      var firstInvalid = null;

      fields.forEach(function (field) {
        if (field.disabled) {
          return;
        }

        var message = messageFor(field);
        setFieldMessage(field, message);

        if (message && !firstInvalid) {
          firstInvalid = field;
        }
      });

      if (firstInvalid) {
        form.classList.remove("is-shaking");
        void form.offsetWidth;
        form.classList.add("is-shaking");
        window.setTimeout(function () {
          form.classList.remove("is-shaking");
        }, 640);

        showToast("Please complete your delivery details.", "error");
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({
          block: "center",
          behavior: reduceMotion() ? "auto" : "smooth"
        });
        return;
      }

      var cart = readCart();

      if (!cartCount(cart)) {
        showToast("Your cart is empty — add an instrument first.", "error");
        return;
      }

      var subtotal = cartSubtotal(cart);
      var shipping = shippingFor(subtotal);
      var total = subtotal + shipping;
      var orderNo = "RMD-" + String(Date.now()).slice(-6);
      var button = $("#place-order");

      /* Read the delivery details before the cart is cleared. */
      var deliveredTo =
        ($("#order-name") ? $("#order-name").value : "") +
        " · " +
        ($("#order-city") ? $("#order-city").value : "") +
        ", " +
        ($("#order-country") ? $("#order-country").value : "");

      if (button) {
        button.classList.add("is-loading");
      }

      window.setTimeout(function () {
        if (button) {
          button.classList.remove("is-loading");
        }

        var rows = $("#order-confirmation-rows");

        if (rows) {
          rows.innerHTML = "";

          var addLine = function (label, value, extraClass) {
            var line = document.createElement("div");
            var left = document.createElement("span");
            var right = document.createElement("strong");

            line.className =
              "order-confirmation-line" + (extraClass ? " " + extraClass : "");
            left.textContent = label;
            right.textContent = value;
            line.appendChild(left);
            line.appendChild(right);
            rows.appendChild(line);
          };

          addLine("Deliver to", deliveredTo);

          cartSlugs(cart).forEach(function (slug) {
            addLine(
              PRODUCTS[slug].short + " × " + cart[slug],
              money(PRODUCTS[slug].price * cart[slug])
            );
          });

          addLine("Shipping", shipping > 0 ? money(shipping) : "Free");
          addLine("Total paid", money(total), "summary-line-total");
        }

        setText("#order-number", orderNo);

        writeCart({});
        render();

        if (confirmation) {
          confirmation.hidden = false;
          confirmation.scrollIntoView({
            block: "start",
            behavior: reduceMotion() ? "auto" : "smooth"
          });
        }

        showToast("Order " + orderNo + " placed — thank you!", "success");
      }, 700);
    });

    render();
  }

  function boot() {
    initScrollProgress();
    initReveal();
    initNavbar();
    initBackToTop();
    initPasswordToggles();
    initStrengthMeter();
    initConfirmMatch();
    initProfilePanel();
    initForms();
    initRipple();
    initCardTilt();
    initFooterYear();
    initHashHighlight();
    initNavProfile();
    initNavCart();
    initProductCards();
    initProductDetail();
    initCartPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
