"use client";

import { useEffect, useState } from "react";

import {
  BACKGROUND_LOCAL_DRAFT_SYNC_STATUSES,
  canSyncBackgroundLocalDraft,
  formatBackgroundLocalDraftSyncStatus,
  normalizeBackgroundLocalDraftBody,
  type BackgroundLocalDraftSyncResult,
  type BackgroundLocalDraftSyncStatus,
} from "@/lib/background-local-drafts";

const DB_NAME = "moral-trade-background-networking";
const STORE_NAME = "local-drafts";
const DB_VERSION = 2;
const DRAFT_LIST_LIMIT = 8;

type SyncDraftAction = (formData: FormData) => Promise<BackgroundLocalDraftSyncResult>;

interface BackgroundLocalDraftsPanelProps {
  syncDraftAction?: SyncDraftAction;
}

interface LocalDraftRecord {
  body: string;
  id: string;
  lastAttemptAt?: string;
  lastError?: string;
  retryCount: number;
  syncedAt?: string;
  syncStatus: BackgroundLocalDraftSyncStatus;
  updatedAt: string;
}

function isDraftSyncStatus(value: unknown): value is BackgroundLocalDraftSyncStatus {
  return (
    typeof value === "string" &&
    (BACKGROUND_LOCAL_DRAFT_SYNC_STATUSES as readonly string[]).includes(value)
  );
}

function normalizeLocalDraftRecord(record: Partial<LocalDraftRecord>): LocalDraftRecord {
  return {
    body: normalizeBackgroundLocalDraftBody(record.body ?? ""),
    id: record.id || crypto.randomUUID(),
    lastAttemptAt: record.lastAttemptAt,
    lastError: record.lastError,
    retryCount: Math.max(0, Number(record.retryCount) || 0),
    syncedAt: record.syncedAt,
    syncStatus: isDraftSyncStatus(record.syncStatus) ? record.syncStatus : "draft",
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

function sortDrafts(records: LocalDraftRecord[]) {
  return [...records]
    .filter((record) => record.body)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, DRAFT_LIST_LIMIT);
}

function openDraftDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function readDrafts() {
  const db = await openDraftDatabase();

  return new Promise<LocalDraftRecord[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve(sortDrafts((request.result as Partial<LocalDraftRecord>[]).map(normalizeLocalDraftRecord)));
    transaction.oncomplete = () => db.close();
  });
}

async function putDraft(record: LocalDraftRecord) {
  const db = await openDraftDatabase();

  return new Promise<LocalDraftRecord>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(record);
    transaction.oncomplete = () => db.close();
  });
}

async function saveDraft(body: string) {
  const record: LocalDraftRecord = {
    body: normalizeBackgroundLocalDraftBody(body),
    id: crypto.randomUUID(),
    retryCount: 0,
    syncStatus: "draft",
    updatedAt: new Date().toISOString(),
  };

  return putDraft(record);
}

async function clearDrafts() {
  const db = await openDraftDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
}

export function BackgroundLocalDraftsPanel({ syncDraftAction }: BackgroundLocalDraftsPanelProps) {
  const [drafts, setDrafts] = useState<LocalDraftRecord[]>([]);
  const [draftBody, setDraftBody] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState("Local draft store ready");

  useEffect(() => {
    if (typeof globalThis.indexedDB === "undefined") {
      const statusTimer = globalThis.setTimeout(() => {
        setStatus("Local draft storage unavailable");
      }, 0);

      return () => globalThis.clearTimeout(statusTimer);
    }

    readDrafts()
      .then((records) => {
        setDrafts(records);
        setStatus(records.length ? `${records.length} draft(s) on this device` : "No local drafts");
      })
      .catch(() => {
        setStatus("Local draft storage unavailable");
      });
  }, []);

  useEffect(() => {
    function refreshOnlineState() {
      setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }

    refreshOnlineState();
    globalThis.addEventListener("online", refreshOnlineState);
    globalThis.addEventListener("offline", refreshOnlineState);

    return () => {
      globalThis.removeEventListener("online", refreshOnlineState);
      globalThis.removeEventListener("offline", refreshOnlineState);
    };
  }, []);

  async function persistDraft(record: LocalDraftRecord) {
    const savedDraft = await putDraft(record);

    setDrafts((records) =>
      sortDrafts(records.map((draft) => (draft.id === savedDraft.id ? savedDraft : draft))),
    );

    return savedDraft;
  }

  async function handleSaveDraft() {
    const body = normalizeBackgroundLocalDraftBody(draftBody);

    if (!body) {
      setStatus("Draft is empty");
      return;
    }

    try {
      const savedDraft = await saveDraft(body);
      setDrafts((records) => sortDrafts([savedDraft, ...records]));
      setDraftBody("");
      setStatus("Draft saved on this device");
    } catch {
      setStatus("Could not save draft locally");
    }
  }

  async function handleQueueDraft(draft: LocalDraftRecord) {
    try {
      await persistDraft({
        ...draft,
        lastError: "",
        syncStatus: "queued",
        updatedAt: new Date().toISOString(),
      });
      setStatus("Draft queued for explicit retry");
    } catch {
      setStatus("Could not queue draft locally");
    }
  }

  async function handleSyncDraft(draft: LocalDraftRecord) {
    if (!syncDraftAction) {
      setStatus("Server sync is not available in this environment");
      return;
    }

    if (!isOnline) {
      await persistDraft({
        ...draft,
        lastError: "Device is offline; retry when the network is available.",
        syncStatus: "queued",
        updatedAt: new Date().toISOString(),
      });
      setStatus("Device is offline; draft remains queued");
      return;
    }

    const attempt: LocalDraftRecord = {
      ...draft,
      lastAttemptAt: new Date().toISOString(),
      lastError: "",
      retryCount: draft.retryCount + 1,
      syncStatus: "syncing",
      updatedAt: new Date().toISOString(),
    };

    setIsSyncing(true);

    try {
      await persistDraft(attempt);
      const formData = new FormData();
      formData.set("draft_id", attempt.id);
      formData.set("draft_body", attempt.body);
      formData.set("draft_label", `Local draft ${new Date(attempt.updatedAt).toLocaleDateString()}`);

      const result = await syncDraftAction(formData);
      await persistDraft({
        ...attempt,
        lastError: result.ok ? "" : result.message,
        syncedAt: result.syncedAt,
        syncStatus: result.ok ? "synced" : "failed",
        updatedAt: new Date().toISOString(),
      });
      setStatus(result.message);
    } catch {
      await persistDraft({
        ...attempt,
        lastError: "Draft sync failed before the server accepted it.",
        syncStatus: "failed",
        updatedAt: new Date().toISOString(),
      });
      setStatus("Draft sync failed; it remains in the retry queue");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRetryQueuedDrafts() {
    const retryableDrafts = drafts.filter((draft) => canSyncBackgroundLocalDraft(draft.syncStatus));

    if (!retryableDrafts.length) {
      setStatus("No queued drafts need retry");
      return;
    }

    for (const draft of retryableDrafts.slice(0, 3)) {
      await handleSyncDraft(draft);
    }
  }

  async function handleClearDrafts() {
    try {
      await clearDrafts();
      setDrafts([]);
      setStatus("Local drafts cleared on this device");
    } catch {
      setStatus("Could not clear local drafts");
    }
  }

  return (
    <article className="panel data-card">
      <p className="detail-kicker">Local drafts</p>
      <h3>Private draft queue</h3>
      <p className="route-text">
        Drafts stay in this browser until you queue a sync. Sync saves the note as a manual source
        for review; it does not run matching or ingest external data.
      </p>
      <label className="field">
        <span>Draft note</span>
        <textarea
          onChange={(event) => setDraftBody(event.target.value)}
          placeholder="Draft a wish, boundary, or source summary before saving it to your profile."
          rows={4}
          value={draftBody}
        />
      </label>
      <div className="offer-actions">
        <button className="button button-secondary button-mini" onClick={handleSaveDraft} type="button">
          Save local draft
        </button>
        <button
          className="button button-secondary button-mini"
          disabled={isSyncing}
          onClick={handleRetryQueuedDrafts}
          type="button"
        >
          Retry queued
        </button>
        <button className="button button-secondary button-mini" onClick={handleClearDrafts} type="button">
          Clear local drafts
        </button>
      </div>
      <p className="route-text">
        {status} · {isOnline ? "Online" : "Offline"}
      </p>
      {drafts.length ? (
        <ul className="clean-list">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <strong>{new Date(draft.updatedAt).toLocaleDateString()}</strong> ·{" "}
              {formatBackgroundLocalDraftSyncStatus(draft.syncStatus)} · attempts{" "}
              {draft.retryCount}
              <br />
              {draft.body.slice(0, 140)}
              {draft.lastError ? (
                <>
                  <br />
                  <span>Last retry: {draft.lastError}</span>
                </>
              ) : null}
              <div className="offer-actions">
                <button
                  className="button button-secondary button-mini"
                  disabled={draft.syncStatus === "synced" || draft.syncStatus === "syncing"}
                  onClick={() => {
                    void handleQueueDraft(draft);
                  }}
                  type="button"
                >
                  Queue for sync
                </button>
                <button
                  className="button button-secondary button-mini"
                  disabled={!canSyncBackgroundLocalDraft(draft.syncStatus) || isSyncing}
                  onClick={() => {
                    void handleSyncDraft(draft);
                  }}
                  type="button"
                >
                  Sync now
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
