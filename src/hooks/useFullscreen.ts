"use client";
import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      );
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const enter = useCallback(() => {
    const el = document.documentElement as any;
    (el.requestFullscreen ?? el.webkitRequestFullscreen ?? (() => {})).call(el);
  }, []);

  const exit = useCallback(() => {
    const doc = document as any;
    (doc.exitFullscreen ?? doc.webkitExitFullscreen ?? (() => {})).call(doc);
  }, []);

  const toggle = useCallback(() => {
    isFullscreen ? exit() : enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, enter, exit, toggle };
}
