/* GA4 basic consent mode: load the Google tag only after an explicit opt-in. */
(function () {
  "use strict";

  const siteRoot = new URL("../../", document.currentScript.src);
  const config = window.PORTFOLIO_ANALYTICS_CONFIG || {};
  const measurementId = config.measurementId || "";
  const enabled = /^G-[A-Z0-9]{6,}$/.test(measurementId)
    && window.location.hostname === config.hostname;
  const storageKey = "portfolio-analytics-consent-v1";
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const disableKey = "ga-disable-" + measurementId;
  let memoryConsent = null;
  let useMemoryConsent = false;
  let started = false;
  let banner;
  let settingsButton;
  let privacyLink;
  let forceOpen = false;

  const copy = {
    fr: {
      title: "Statistiques de visite",
      description: "Avec votre accord, Google Analytics utilise des cookies pour mesurer les visites, les retours sur le site et les clics sur les CV et rapports. Votre choix est conservé pendant 6 mois. Le portfolio reste accessible si vous refusez.",
      accept: "Accepter", reject: "Refuser", settings: "Choix des cookies",
      privacy: "Confidentialité", close: "Fermer",
      accepted: "Vous avez accepté la mesure d’audience.",
      rejected: "Vous avez refusé la mesure d’audience.",
      pending: "La mesure d’audience attend votre accord.",
      inactive: "La mesure d’audience n’est pas activée."
    },
    en: {
      title: "Visitor statistics",
      description: "With your permission, Google Analytics uses cookies to measure visits, return visits and clicks on CVs and reports. Your choice is saved for 6 months. You can browse the portfolio if you decline.",
      accept: "Accept", reject: "Decline", settings: "Cookie choices",
      privacy: "Privacy", close: "Close",
      accepted: "You have accepted audience measurement.",
      rejected: "You have declined audience measurement.",
      pending: "Audience measurement is waiting for your permission.",
      inactive: "Audience measurement is not enabled."
    }
  };

  function language() {
    return document.documentElement.lang.startsWith("fr") ? "fr" : "en";
  }

  function readConsent() {
    let consent = memoryConsent;
    try {
      if (!useMemoryConsent) consent = JSON.parse(window.localStorage.getItem(storageKey));
    } catch (_) { /* Keep the choice in memory when storage is unavailable. */ }
    if (!consent || consent.version !== 1 || !Number.isFinite(consent.expiresAt)
      || consent.expiresAt <= Date.now()
      || !["accepted", "rejected"].includes(consent.choice)) return null;
    return consent;
  }

  function hasConsent() {
    return enabled && readConsent()?.choice === "accepted";
  }

  function clearAnalyticsCookies() {
    document.cookie.split(";").forEach(function (cookie) {
      const name = cookie.trim().split("=")[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      ["", "; domain=" + window.location.hostname, "; domain=." + window.location.hostname]
        .forEach(function (domain) {
          document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax" + domain;
        });
    });
  }

  function stopTracking() {
    window[disableKey] = true;
    clearAnalyticsCookies();
    if (started) {
      // Unload all Google listeners too; the next page reads the saved refusal.
      window.location.reload();
    }
  }

  function pageLocation() {
    const url = new URL(window.location.href);
    const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    const query = new URLSearchParams();
    campaignKeys.forEach(function (key) {
      const value = url.searchParams.get(key);
      if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) query.set(key, value);
    });
    return url.origin + url.pathname + (query.size ? "?" + query.toString() : "");
  }

  function startTracking() {
    if (started || !hasConsent()) return;
    started = true;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    let referrer = "";
    try { referrer = new URL(document.referrer).origin; } catch (_) { /* No referrer. */ }
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: "none",
      cookie_path: "/",
      cookie_expires: consentLifetime / 1000,
      cookie_update: false,
      cookie_flags: "SameSite=Lax;Secure",
      page_location: pageLocation(),
      page_referrer: referrer,
      content_group: language()
    });
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.appendChild(tag);
  }

  function choose(choice) {
    memoryConsent = { version: 1, choice: choice, expiresAt: Date.now() + consentLifetime };
    try { window.localStorage.setItem(storageKey, JSON.stringify(memoryConsent)); }
    catch (_) { useMemoryConsent = true; }
    forceOpen = false;
    if (choice === "accepted") startTracking();
    else stopTracking();
    refresh();
    settingsButton.focus({ preventScroll: true });
  }

  function refresh() {
    const labels = copy[language()];
    privacyLink.textContent = labels.privacy;
    privacyLink.href = new URL(language() === "fr" ? "fr/privacy.html" : "en/privacy.html", siteRoot).href;
    if (!enabled) {
      document.querySelectorAll("[data-analytics-status]")
        .forEach(function (node) { node.textContent = labels.inactive; });
      return;
    }
    const consent = readConsent();
    banner.querySelector("h2").textContent = labels.title;
    banner.querySelector("p").textContent = labels.description;
    banner.querySelector("[data-analytics-accept]").textContent = labels.accept;
    banner.querySelector("[data-analytics-reject]").textContent = labels.reject;
    const notice = banner.querySelector("a");
    notice.textContent = labels.privacy;
    notice.href = privacyLink.href;
    const close = banner.querySelector("[data-analytics-close]");
    close.textContent = labels.close;
    close.hidden = !consent;
    settingsButton.textContent = labels.settings;
    const languageDialogOpen = document.body.classList.contains("language-dialog-open");
    banner.hidden = languageDialogOpen || (!forceOpen && !!consent);
    settingsButton.setAttribute("aria-expanded", String(!banner.hidden));
    document.querySelectorAll("[data-analytics-status]").forEach(function (node) {
      node.textContent = !consent ? labels.pending
        : consent.choice === "accepted" ? labels.accepted : labels.rejected;
    });
    document.querySelectorAll("[data-analytics-preferences]").forEach(function (node) {
      node.hidden = false;
    });
  }

  function init() {
    const footer = document.querySelector(".sidebar-footer, .footer-bottom") || document.body;
    const controls = document.createElement("div");
    controls.className = "analytics-controls";
    privacyLink = document.createElement("a");
    controls.appendChild(privacyLink);
    footer.appendChild(controls);
    if (enabled) {
      window[disableKey] = true;
      settingsButton = document.createElement("button");
      settingsButton.type = "button";
      settingsButton.dataset.analyticsPreferences = "";
      settingsButton.setAttribute("aria-controls", "analytics-consent");
      controls.appendChild(settingsButton);
      banner = document.createElement("section");
      banner.id = "analytics-consent";
      banner.className = "analytics-consent";
      banner.setAttribute("aria-labelledby", "analytics-consent-title");
      banner.hidden = true;
      banner.innerHTML = '<h2 id="analytics-consent-title"></h2><p></p>'
        + '<div class="analytics-actions"><button type="button" data-analytics-reject></button>'
        + '<button type="button" data-analytics-accept></button></div>'
        + '<div class="analytics-details"><a></a><button type="button" data-analytics-close hidden></button></div>';
      document.body.appendChild(banner);
      banner.querySelector("[data-analytics-accept]").addEventListener("click", function () { choose("accepted"); });
      banner.querySelector("[data-analytics-reject]").addEventListener("click", function () { choose("rejected"); });
      banner.querySelector("[data-analytics-close]").addEventListener("click", function () {
        forceOpen = false;
        refresh();
        settingsButton.focus({ preventScroll: true });
      });
      document.addEventListener("click", function (event) {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest("[data-analytics-preferences]")) {
          forceOpen = true;
          refresh();
          banner.querySelector("[data-analytics-reject]").focus({ preventScroll: true });
          return;
        }
        if (!started || !hasConsent()) return;
        const link = event.target.closest("a[href]");
        if (!link) return;
        const url = new URL(link.href, window.location.href);
        if (url.protocol === "mailto:") {
          window.gtag("event", "contact_click", { contact_method: "email", site_language: language() });
        } else if (url.origin === window.location.origin && /\.pdf$/i.test(url.pathname)) {
          const isCV = url.pathname.includes("/documents/resume/");
          window.gtag("event", isCV ? "cv_download" : "report_download", {
            document_name: decodeURIComponent(url.pathname.split("/").pop()),
            document_language: /-fr\.pdf$/i.test(url.pathname) ? "fr"
              : /-en\.pdf$/i.test(url.pathname) ? "en" : "unspecified",
            site_language: language(), transport_type: "beacon"
          });
        }
      });
      const synchronizeConsent = function () {
        if (hasConsent()) startTracking();
        else stopTracking();
        refresh();
      };
      window.addEventListener("storage", function (event) {
        if (event.key === storageKey || event.key === null) synchronizeConsent();
      });
      window.addEventListener("pageshow", synchronizeConsent);
      window.setInterval(synchronizeConsent, 60000);
      if (hasConsent()) startTracking();
      else clearAnalyticsCookies();
    }
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
