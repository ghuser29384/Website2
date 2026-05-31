"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildLocalConsentGrantReceipt,
  buildLocalMatchExplanationReceipt,
  summarizeLocalTransparencyReceipts,
  type BackgroundLocalTransparencyGrantInput,
  type BackgroundLocalTransparencyMatchSnapshotInput,
  type BackgroundLocalTransparencyReceipt,
} from "@/lib/background-local-transparency";

const DB_NAME = "moral-trade-background-networking-transparency";
const STORE_NAME = "local-transparency-receipts";
const DB_VERSION = 1;
const RECEIPT_LIST_LIMIT = 6;

interface BackgroundLocalTransparencyPanelProps {
  consentGrants: BackgroundLocalTransparencyGrantInput[];
  matchSnapshots: BackgroundLocalTransparencyMatchSnapshotInput[];
}

function openReceiptDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function sortReceipts(receipts: BackgroundLocalTransparencyReceipt[]) {
  return [...receipts]
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    .slice(0, RECEIPT_LIST_LIMIT);
}

async function readReceipts() {
  const db = await openReceiptDatabase();

  return new Promise<BackgroundLocalTransparencyReceipt[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve(sortReceipts(request.result as BackgroundLocalTransparencyReceipt[]));
    transaction.oncomplete = () => db.close();
  });
}

async function saveReceipts(receipts: BackgroundLocalTransparencyReceipt[]) {
  if (!receipts.length) {
    return [];
  }

  const db = await openReceiptDatabase();

  return new Promise<BackgroundLocalTransparencyReceipt[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const receipt of receipts) {
      store.put(receipt);
    }

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(receipts);
    };
  });
}

async function clearReceipts() {
  const db = await openReceiptDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
}

function formatReceipt(receipt: BackgroundLocalTransparencyReceipt) {
  if (receipt.kind === "match_explanation") {
    return `${receipt.workflowStage ?? "match"} · ${receipt.scoreBucket ?? "score"} · ${(
      receipt.factorCodes ?? []
    ).join(", ")}`;
  }

  return `${receipt.fieldLabel ?? receipt.fieldKey ?? "Field"} · ${
    receipt.accessLevel ?? "access"
  } · ${receipt.status ?? "status"}`;
}

export function BackgroundLocalTransparencyPanel({
  consentGrants,
  matchSnapshots,
}: BackgroundLocalTransparencyPanelProps) {
  const [receipts, setReceipts] = useState<BackgroundLocalTransparencyReceipt[]>([]);
  const [status, setStatus] = useState("Local transparency receipts ready");
  const incomingReceipts = useMemo(
    () => [
      ...matchSnapshots.map(buildLocalMatchExplanationReceipt),
      ...consentGrants.map(buildLocalConsentGrantReceipt),
    ],
    [consentGrants, matchSnapshots],
  );
  const summary = summarizeLocalTransparencyReceipts(receipts);

  useEffect(() => {
    if (typeof globalThis.indexedDB === "undefined") {
      const statusTimer = globalThis.setTimeout(() => {
        setStatus("Local transparency receipts unavailable");
      }, 0);

      return () => globalThis.clearTimeout(statusTimer);
    }

    saveReceipts(incomingReceipts)
      .then(readReceipts)
      .then((records) => {
        setReceipts(records);
        setStatus(
          incomingReceipts.length
            ? `${incomingReceipts.length} current receipt(s) saved locally`
            : "No current receipts to save locally",
        );
      })
      .catch(() => {
        setStatus("Could not update local transparency receipts");
      });
  }, [incomingReceipts]);

  async function handleClearReceipts() {
    try {
      await clearReceipts();
      setReceipts([]);
      setStatus("Local transparency receipts cleared on this device");
    } catch {
      setStatus("Could not clear local transparency receipts");
    }
  }

  return (
    <article className="panel data-card">
      <p className="detail-kicker">Local transparency</p>
      <h3>Seen explanations and consent receipts</h3>
      <p className="route-text">
        This browser keeps compact receipts for match explanations and grant changes you have
        already seen. Receipts store factor codes, stages, and field labels only.
      </p>
      <dl className="values-summary compact-summary">
        <div>
          <dt>Seen explanations</dt>
          <dd>{summary.matchExplanations}</dd>
        </div>
        <div>
          <dt>Consent receipts</dt>
          <dd>{summary.consentGrants}</dd>
        </div>
        <div>
          <dt>Revoked receipts</dt>
          <dd>{summary.revokedConsentReceipts}</dd>
        </div>
      </dl>
      <p className="route-text">{status}</p>
      {receipts.length ? (
        <ul className="clean-list">
          {receipts.map((receipt) => (
            <li key={receipt.key}>
              <strong>{receipt.kind.replaceAll("_", " ")}</strong> · {formatReceipt(receipt)}
            </li>
          ))}
        </ul>
      ) : null}
      <button className="button button-secondary button-mini" onClick={handleClearReceipts} type="button">
        Clear local receipts
      </button>
    </article>
  );
}
