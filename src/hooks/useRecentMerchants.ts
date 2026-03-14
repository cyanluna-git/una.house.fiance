"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "unahouse.recentMerchants";
const MAX_ITEMS = 6;

let listeners: Array<() => void> = [];

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return window.localStorage.getItem(STORAGE_KEY) || "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function parseItems(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

export function useRecentMerchants(): {
  merchants: string[];
  addMerchant: (name: string) => void;
} {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const merchants = parseItems(raw);

  const addMerchant = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = parseItems(
      window.localStorage.getItem(STORAGE_KEY) || "[]"
    );
    const filtered = current.filter((m) => m !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    emitChange();
  }, []);

  return { merchants, addMerchant };
}
