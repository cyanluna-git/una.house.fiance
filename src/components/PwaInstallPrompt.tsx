"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "unahouse.pwa-install-dismissed-until";

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY));
    if (!Number.isNaN(dismissedUntil) && dismissedUntil > Date.now()) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.warn("Service worker registration failed", error);
      }
    };

    registerServiceWorker();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
    };
  }, []);

  if (!isVisible || !promptEvent) return null;

  const handleInstall = async () => {
    setIsVisible(false);
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  };

  const handleDismiss = () => {
    const in7Days = Date.now() + 1000 * 60 * 60 * 24 * 7;
    localStorage.setItem(DISMISS_KEY, String(in7Days));
    setIsVisible(false);
    setPromptEvent(null);
  };

  return (
    <div className="fixed top-16 right-3 left-3 z-40 rounded-xl border border-blue-100 bg-blue-600 px-4 py-3 text-white shadow-lg md:hidden">
      <div className="mb-2 text-sm font-semibold">홈 화면에 추가</div>
      <p className="text-xs leading-5 mb-3">
        앱처럼 바로 사용할 수 있도록 홈 화면에 설치해 보세요.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700"
        >
          설치
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-white/40 px-3 py-2 text-sm"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
