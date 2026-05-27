"use client";

import { useEffect, useState } from "react";

const DB_NAME = "moral-trade-background-networking";
const STORE_NAME = "local-drafts";
const DB_VERSION = 1;

interface LocalDraftRecord {
  body: string;
  id: string;
  updatedAt: string;
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
    request.onsuccess = () => resolve((request.result as LocalDraftRecord[]).reverse());
    transaction.oncomplete = () => db.close();
  });
}

async function saveDraft(body: string) {
  const db = await openDraftDatabase();
  const record: LocalDraftRecord = {
    body,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise<LocalDraftRecord>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(record);
    transaction.oncomplete = () => db.close();
  });
}

export function BackgroundLocalDraftsPanel() {
  const [drafts, setDrafts] = useState<LocalDraftRecord[]>([]);
  const [draftBody, setDraftBody] = useState("");
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

  async function handleSaveDraft() {
    const body = draftBody.trim();

    if (!body) {
      setStatus("Draft is empty");
      return;
    }

    try {
      const savedDraft = await saveDraft(body.slice(0, 2000));
      setDrafts((records) => [savedDraft, ...records].slice(0, 5));
      setDraftBody("");
      setStatus("Draft saved on this device");
    } catch {
      setStatus("Could not save draft locally");
    }
  }

  return (
    <article className="panel data-card">
      <p className="detail-kicker">Local drafts</p>
      <h3>Private draft queue</h3>
      <label className="field">
        <span>Draft note</span>
        <textarea
          onChange={(event) => setDraftBody(event.target.value)}
          placeholder="Draft a wish, boundary, or source summary before saving it to your profile."
          rows={4}
          value={draftBody}
        />
      </label>
      <button className="button button-secondary button-mini" onClick={handleSaveDraft} type="button">
        Save local draft
      </button>
      <p className="route-text">{status}</p>
      {drafts.length ? (
        <ul className="clean-list">
          {drafts.map((draft) => (
            <li key={draft.id}>
              {new Date(draft.updatedAt).toLocaleDateString()}: {draft.body.slice(0, 120)}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
