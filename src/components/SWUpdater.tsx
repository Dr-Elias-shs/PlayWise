"use client";

import { useEffect } from "react";

/**
 * SWUpdater
 *
 * next-pwa registers the service worker with skipWaiting, so a new version
 * activates immediately — but the page itself never reloads, so wrapped /
 * installed clients (home-screen PWA, WebView wrapper on tablets) keep showing
 * the OLD cached code until the cache is manually cleared.
 *
 * This component fixes that: on launch and whenever the app returns to the
 * foreground, it asks the browser to re-check for a new service worker. When a
 * new one takes control, it reloads the page once so the newest code loads —
 * no manual cache clearing needed after the first bootstrap.
 */
export function SWUpdater() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Whether a previous version was already controlling this client. On a very
    // first install there's no prior version, so we must NOT reload (clientsClaim
    // already takes control cleanly and a reload would just be a needless flash).
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;

    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const checkForUpdate = () => {
      navigator.serviceWorker
        .getRegistration()
        .then(reg => { if (reg) reg.update(); })
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    // Check now (app launch) and every time it comes back to the foreground.
    checkForUpdate();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
