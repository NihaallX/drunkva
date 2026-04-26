import { openDB, type IDBPDatabase } from "idb";
import { useEffect, useRef, useCallback, useState } from "react";

const DB_NAME = "drunkva-offline";
const STORE_NAME = "action-queue";

interface QueuedAction {
  id: string;
  type: string;
  payload: object;
  endpoint: string;
  method: string;
  queuedAt: number;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

export function useOfflineQueue() {
  const syncing = useRef(false);
  const [queueCount, setQueueCount] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const db = await getDB();
      const all: QueuedAction[] = await db.getAll(STORE_NAME);
      setQueueCount(all.length);
    } catch {
      // IDB not available
    }
  }, []);

  const enqueue = useCallback(async (action: Omit<QueuedAction, "id" | "queuedAt">) => {
    const db = await getDB();
    const item: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      queuedAt: Date.now(),
    };
    await db.add(STORE_NAME, item);
    await refreshCount();
  }, [refreshCount]);

  const syncQueue = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;

    try {
      const db = await getDB();
      const all: QueuedAction[] = await db.getAll(STORE_NAME);
      if (all.length === 0) { syncing.current = false; return; }

      // Process in chronological order
      const sorted = all.sort((a, b) => a.queuedAt - b.queuedAt);

      for (const action of sorted) {
        try {
          const res = await fetch(action.endpoint, {
            method: action.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.payload),
          });
          if (res.ok) {
            await db.delete(STORE_NAME, action.id);
          }
          // If 4xx — still delete, don't retry permanent errors
          if (res.status >= 400 && res.status < 500) {
            await db.delete(STORE_NAME, action.id);
          }
          // 5xx — leave in queue, retry next time
        } catch {
          // Network error — leave in queue
        }
      }

      await refreshCount();
      // Show "Synced" flash if queue is now empty
      const remaining: QueuedAction[] = await db.getAll(STORE_NAME);
      if (remaining.length === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    } finally {
      syncing.current = false;
    }
  }, [refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    // Also try to sync on mount (in case we just loaded with pending items)
    if (navigator.onLine) syncQueue();
    refreshCount();
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue, refreshCount]);

  return { enqueue, syncQueue, queueCount, justSynced };
}
