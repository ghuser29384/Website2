"use client";

import {
  Archive,
  ArrowSquareOut,
  CheckCircle,
  Clock,
  ListChecks,
  Plus,
  ShieldCheck,
  SidebarSimple,
  Sparkle,
  Wrench,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { MoralTradeWordmark } from "@/components/brand/moral-trade-wordmark";
import type {
  CommandMessageView,
  CommandRunView,
  CommandSessionView,
  CommandToolCallView,
} from "@/lib/command/types";

import styles from "./command-workspace.module.css";

const ACTIVE_SESSION_KEY = "moral-trade.command.session.v1";
const PENDING_COMMAND_KEY = "moral-trade.command.pending.v1";

interface CommandWorkspaceProps {
  initialError?: string;
  initialSession: CommandSessionView | null;
  initialSessions: CommandSessionView[];
  viewerName: string;
}

interface JsonResponse {
  ok?: boolean;
  error?: string;
  session?: CommandSessionView;
  sessions?: CommandSessionView[];
  blockers?: string[];
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as JsonResponse;
  if (!response.ok) {
    throw new Error(payload.error || payload.blockers?.[0] || `Command request failed (${response.status}).`);
  }
  return payload;
}

function permissionLabel(tool: CommandToolCallView) {
  if (tool.permissionTier === "read_only") return "Read only";
  if (tool.permissionTier === "private_reversible") return "Private / reversible";
  if (tool.permissionTier === "external_consequential") return "External consequence";
  if (tool.permissionTier === "financial_strong_confirmation") return "Financial / strong confirmation";
  return "Blocked";
}

function runForMessage(session: CommandSessionView | null, message: CommandMessageView) {
  const runId = typeof message.metadata.runId === "string" ? message.metadata.runId : "";
  return session?.runs.find((run) => run.id === runId) ?? null;
}

function latestRun(session: CommandSessionView | null) {
  return session?.runs.at(-1) ?? null;
}

function ToolResultLink({ tool, href, label, description }: {
  tool: CommandToolCallView;
  href: string;
  label: string;
  description?: string;
}) {
  function prepareHandoff() {
    const handoff = tool.result?.data?.handoff;
    if (handoff && typeof handoff === "object") {
      const record = handoff as { key?: unknown; value?: unknown };
      if (typeof record.key === "string") {
        window.sessionStorage.setItem(record.key, JSON.stringify(record.value));
      }
    }
  }

  return (
    <Link className={styles.resultLink} href={href} onClick={prepareHandoff}>
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <ArrowSquareOut aria-hidden="true" size={17} />
    </Link>
  );
}

function StructuredDiff({ tool }: { tool: CommandToolCallView }) {
  const diff = tool.result?.data?.diff;
  if (!diff || typeof diff !== "object" || Array.isArray(diff)) return null;
  const before = (diff as Record<string, unknown>).before;
  const after = (diff as Record<string, unknown>).after;
  return (
    <div className={styles.diff}>
      <div>
        <span>Existing terms</span>
        <p>{typeof before === "string" ? before : JSON.stringify(before)}</p>
      </div>
      <div>
        <span>Proposed change</span>
        <p>{typeof after === "string" ? after : JSON.stringify(after)}</p>
      </div>
    </div>
  );
}

function ToolCard({
  tool,
  confirming,
  confirmationValue,
  onConfirmationValueChange,
  onConfirm,
}: {
  tool: CommandToolCallView;
  confirming: boolean;
  confirmationValue: string;
  onConfirmationValueChange: (value: string) => void;
  onConfirm: () => void;
}) {
  const exactPhrase = tool.confirmationPhrase;
  const confirmLabel = tool.confirmationLevel === "type_exact_phrase"
    ? "Confirm exact financial handoff"
    : "Confirm and continue";
  return (
    <article className={styles.toolCard} data-status={tool.status}>
      <header>
        <span className={styles.toolIcon}><Wrench aria-hidden="true" size={16} /></span>
        <div>
          <h3>{tool.title}</h3>
          <p>{tool.summary}</p>
        </div>
        <span className={styles.toolStatus}>{tool.status.replaceAll("_", " ")}</span>
      </header>
      <div className={styles.toolMeta}>
        <span>{permissionLabel(tool)}</span>
        <span>{Math.round(tool.confidence * 100)}% confidence</span>
        <span>{tool.reversible ? "Reversible" : "Not automatically reversible"}</span>
      </div>
      <StructuredDiff tool={tool} />
      {tool.result ? (
        <div className={styles.toolResult}>
          <strong>{tool.result.summary}</strong>
          <p>{tool.result.stateClaim}</p>
          {tool.result.blockers.length ? (
            <ul>{tool.result.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          ) : null}
          {tool.result.links.length ? (
            <div className={styles.resultLinks}>
              {tool.result.links.map((link) => (
                <ToolResultLink
                  description={link.description}
                  href={link.href}
                  key={`${link.href}-${link.label}`}
                  label={link.label}
                  tool={tool}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {tool.status === "awaiting_confirmation" ? (
        <div className={styles.confirmation}>
          <div className={styles.consequenceGrid}>
            <div><span>Public</span><p>{tool.consequence.public}</p></div>
            <div><span>Financial</span><p>{tool.consequence.financial}</p></div>
            <div><span>Privacy</span><p>{tool.consequence.privacy}</p></div>
            <div><span>Legal</span><p>{tool.consequence.legal}</p></div>
          </div>
          {exactPhrase ? (
            <label>
              <span>Type this exact phrase</span>
              <code>{exactPhrase}</code>
              <input
                autoComplete="off"
                onChange={(event) => onConfirmationValueChange(event.target.value)}
                value={confirmationValue}
              />
            </label>
          ) : null}
          <button
            className={styles.confirmButton}
            disabled={confirming || Boolean(exactPhrase && confirmationValue !== exactPhrase)}
            onClick={onConfirm}
            type="button"
          >
            {confirming ? "Confirming…" : confirmLabel}
          </button>
          <p className={styles.confirmNote}>
            Confirmation prepares the authoritative product workflow. Command does not claim that an
            invitation, evidence submission, payment, cancellation, refund, or settlement succeeded
            until the relevant server or provider records it.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function RunTools({
  run,
  confirmationValues,
  confirmingToolId,
  onConfirmationValueChange,
  onConfirm,
}: {
  run: CommandRunView;
  confirmationValues: Record<string, string>;
  confirmingToolId: string | null;
  onConfirmationValueChange: (toolId: string, value: string) => void;
  onConfirm: (tool: CommandToolCallView) => void;
}) {
  if (!run.toolCalls.length) return null;
  return (
    <div className={styles.runTools}>
      {run.toolCalls.map((tool) => (
        <ToolCard
          confirmationValue={confirmationValues[tool.id] ?? ""}
          confirming={confirmingToolId === tool.id}
          key={tool.id}
          onConfirm={() => onConfirm(tool)}
          onConfirmationValueChange={(value) => onConfirmationValueChange(tool.id, value)}
          tool={tool}
        />
      ))}
    </div>
  );
}

export function CommandWorkspace({
  initialError = "",
  initialSession,
  initialSessions,
  viewerName,
}: CommandWorkspaceProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [session, setSession] = useState(initialSession);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState(initialError);
  const [sending, setSending] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [confirmingToolId, setConfirmingToolId] = useState<string | null>(null);
  const [confirmationValues, setConfirmationValues] = useState<Record<string, string>>({});
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const pendingHandled = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentRun = latestRun(session);
  const activeSessions = useMemo(() => sessions.filter((entry) => entry.state === "active"), [sessions]);

  const replaceSession = useCallback((nextSession: CommandSessionView) => {
    setSession(nextSession);
    setSessions((current) => {
      const without = current.filter((entry) => entry.id !== nextSession.id);
      return [nextSession, ...without].sort(
        (left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt),
      );
    });
    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, nextSession.id);
    const url = new URL(window.location.href);
    url.searchParams.set("session", nextSession.id);
    window.history.replaceState({}, "", url);
  }, []);

  const createSession = useCallback(async (prompt = "") => {
    setCreatingSession(true);
    setError("");
    try {
      const payload = await requestJson("/api/command/sessions", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      if (!payload.session) throw new Error("Command did not return the new session.");
      replaceSession(payload.session);
      return payload.session;
    } finally {
      setCreatingSession(false);
    }
  }, [replaceSession]);

  const loadSession = useCallback(async (sessionId: string) => {
    setError("");
    try {
      const payload = await requestJson(`/api/command/sessions/${encodeURIComponent(sessionId)}`);
      if (!payload.session) throw new Error("Command session was not returned.");
      replaceSession(payload.session);
      setLeftOpen(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Command history could not be loaded.");
    }
  }, [replaceSession]);

  const sendCommand = useCallback(async (providedMessage?: string) => {
    const message = (providedMessage ?? composer).trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    setComposer("");
    try {
      let target = session;
      if (!target) target = await createSession(message);
      const optimistic: CommandSessionView = {
        ...target,
        messages: [
          ...target.messages,
          {
            id: `optimistic-${Date.now()}`,
            role: "user",
            body: message,
            messageKind: "message",
            metadata: { optimistic: true },
            createdAt: new Date().toISOString(),
          },
        ],
      };
      setSession(optimistic);
      const payload = await requestJson(
        `/api/command/sessions/${encodeURIComponent(target.id)}/turn`,
        { method: "POST", body: JSON.stringify({ message }) },
      );
      if (!payload.session) throw new Error("Command did not return the updated conversation.");
      replaceSession(payload.session);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Command could not complete the turn.");
      if (session) setSession(session);
    } finally {
      setSending(false);
    }
  }, [composer, createSession, replaceSession, sending, session]);

  useEffect(() => {
    if (pendingHandled.current) return;
    pendingHandled.current = true;
    const pending = window.sessionStorage.getItem(PENDING_COMMAND_KEY)?.trim() ?? "";
    if (!pending) return;
    window.sessionStorage.removeItem(PENDING_COMMAND_KEY);
    void sendCommand(pending);
  }, [sendCommand]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [session?.messages.length, sending]);

  async function archiveCurrentSession() {
    if (!session) return;
    try {
      const payload = await requestJson(`/api/command/sessions/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "archived" }),
      });
      if (payload.session) {
        setSessions((current) => current.map((entry) => entry.id === payload.session?.id ? payload.session : entry));
        setSession(null);
      }
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "The conversation could not be archived.");
    }
  }

  async function confirmTool(tool: CommandToolCallView) {
    setConfirmingToolId(tool.id);
    setError("");
    try {
      const confirmation = tool.confirmationLevel === "type_exact_phrase"
        ? confirmationValues[tool.id] ?? ""
        : "confirm";
      const payload = await requestJson(
        `/api/command/tool-calls/${encodeURIComponent(tool.id)}/confirm`,
        { method: "POST", body: JSON.stringify({ confirmation }) },
      );
      if (!payload.session) throw new Error("Command did not return the confirmed conversation.");
      replaceSession(payload.session);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Confirmation failed. No action was taken.");
    } finally {
      setConfirmingToolId(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCommand();
  }

  function revisePlan() {
    setComposer("Revise the current plan: ");
    setRightOpen(false);
    composerRef.current?.focus();
  }

  return (
    <main className={styles.workspace} id="main-content" tabIndex={-1}>
      <header className={styles.topbar}>
        <button aria-label="Open conversations" className={styles.mobileButton} onClick={() => setLeftOpen(true)} type="button">
          <SidebarSimple size={20} />
        </button>
        <Link aria-label="Moral Trade, home" className={styles.brand} href="/">
          <MoralTradeWordmark />
        </Link>
        <div className={styles.topbarTitle}>
          <strong>Command</strong>
          <span>Plan · preview · execute</span>
        </div>
        <nav aria-label="Command navigation">
          <Link href="/feed">Feed</Link>
          <Link href="/discover">Discover</Link>
          <Link href="/commitments">Commitments</Link>
        </nav>
        <button aria-label="Open plan and tools" className={styles.mobileButton} onClick={() => setRightOpen(true)} type="button">
          <ListChecks size={20} />
        </button>
      </header>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${leftOpen ? styles.open : ""}`}>
          <div className={styles.mobilePanelHead}>
            <strong>Conversations</strong>
            <button aria-label="Close conversations" onClick={() => setLeftOpen(false)} type="button"><X size={18} /></button>
          </div>
          <button
            className={styles.newButton}
            disabled={creatingSession}
            onClick={() => void createSession()}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            {creatingSession ? "Creating…" : "New command"}
          </button>
          <div className={styles.sessionList}>
            {activeSessions.map((entry) => (
              <button
                className={entry.id === session?.id ? styles.activeSession : ""}
                key={entry.id}
                onClick={() => void loadSession(entry.id)}
                type="button"
              >
                <strong>{entry.title}</strong>
                <span>{entry.summary || "No completed turn yet"}</span>
              </button>
            ))}
            {!activeSessions.length ? <p className={styles.emptyList}>No saved Command conversations yet.</p> : null}
          </div>
          <div className={styles.sidebarFoot}>
            <span>{viewerName}</span>
            <button disabled={!session} onClick={() => void archiveCurrentSession()} type="button">
              <Archive aria-hidden="true" size={15} /> Archive
            </button>
          </div>
        </aside>

        <section className={styles.conversation} aria-label="Command conversation">
          <div className={styles.messages}>
            {!session?.messages.length ? (
              <section className={styles.emptyState}>
                <Sparkle aria-hidden="true" size={28} weight="fill" />
                <h1>What should Moral Trade do?</h1>
                <p>
                  Search, explain, compare, draft, navigate, coordinate a threshold pool, review
                  commitments, or prepare a consequential action for confirmation.
                </p>
                <div className={styles.starters}>
                  {[
                    "Find animal-welfare proposals under $50",
                    "$5 donation to animal welfare if you eat 1 vegetarian meal",
                    "Create a pool where 100 people contribute $20 if at least 80 join",
                    "What commitments need attention?",
                  ].map((starter) => (
                    <button key={starter} onClick={() => void sendCommand(starter)} type="button">{starter}</button>
                  ))}
                </div>
              </section>
            ) : (
              session.messages.map((message) => {
                const run = runForMessage(session, message);
                return (
                  <div className={styles.messageBlock} key={message.id}>
                    <article className={`${styles.message} ${styles[message.role]}`}>
                      <span>{message.role === "user" ? "You" : message.role === "assistant" ? "Command" : "System"}</span>
                      <p>{message.body}</p>
                    </article>
                    {run ? (
                      <RunTools
                        confirmationValues={confirmationValues}
                        confirmingToolId={confirmingToolId}
                        onConfirm={(tool) => void confirmTool(tool)}
                        onConfirmationValueChange={(toolId, value) =>
                          setConfirmationValues((current) => ({ ...current, [toolId]: value }))
                        }
                        run={run}
                      />
                    ) : null}
                  </div>
                );
              })
            )}
            {sending ? (
              <article className={`${styles.message} ${styles.assistant} ${styles.thinking}`} role="status">
                <span>Command</span>
                <p>Planning against the typed capability registry…</p>
              </article>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {error ? <div className={styles.error} role="alert">{error}</div> : null}
          <form className={styles.composer} onSubmit={submit}>
            <textarea
              aria-label="Message Command"
              disabled={sending}
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask Command to do anything in Moral Trade…"
              ref={composerRef}
              rows={1}
              value={composer}
            />
            <button disabled={sending || !composer.trim()} type="submit" aria-label="Send command">
              <ArrowSquareOut aria-hidden="true" size={19} weight="bold" />
            </button>
            <p>
              Command may read immediately, prepare private drafts, or ask for confirmation. It cannot
              bypass exact terms, consent, evidence, authorization, payment, or settlement controls.
            </p>
          </form>
        </section>

        <aside className={`${styles.inspector} ${rightOpen ? styles.open : ""}`}>
          <div className={styles.mobilePanelHead}>
            <strong>Plan and tools</strong>
            <button aria-label="Close plan and tools" onClick={() => setRightOpen(false)} type="button"><X size={18} /></button>
          </div>
          <section className={styles.inspectorSection}>
            <div className={styles.sectionHead}>
              <span><ListChecks aria-hidden="true" size={16} /> Current plan</span>
              {currentRun ? <button onClick={revisePlan} type="button">Revise</button> : null}
            </div>
            {currentRun ? (
              <>
                <div className={styles.runStatus} data-status={currentRun.status}>
                  {currentRun.status === "completed" ? <CheckCircle size={16} /> : <Clock size={16} />}
                  {currentRun.status.replaceAll("_", " ")}
                </div>
                <ol className={styles.planList}>
                  {currentRun.plan.map((step) => (
                    <li data-status={step.status} key={step.id}>
                      <span />
                      <div><strong>{step.label}</strong><small>{step.status}</small></div>
                    </li>
                  ))}
                </ol>
                {currentRun.clarification ? (
                  <div className={styles.clarification}>
                    <strong>Clarification required</strong>
                    <p>{currentRun.clarification.question}</p>
                    <small>{currentRun.clarification.reason}</small>
                  </div>
                ) : null}
              </>
            ) : <p className={styles.inspectorEmpty}>A plan appears after the first command.</p>}
          </section>

          <section className={styles.inspectorSection}>
            <div className={styles.sectionHead}>
              <span><ShieldCheck aria-hidden="true" size={16} /> Permission policy</span>
            </div>
            <div className={styles.policyList}>
              <div><i data-tier="read" /><span><strong>Read only</strong><small>Runs immediately</small></span></div>
              <div><i data-tier="private" /><span><strong>Private / reversible</strong><small>Prepares editable work</small></span></div>
              <div><i data-tier="external" /><span><strong>External consequence</strong><small>Explicit confirmation</small></span></div>
              <div><i data-tier="financial" /><span><strong>Financial</strong><small>Exact typed phrase</small></span></div>
            </div>
          </section>

          <section className={styles.inspectorSection}>
            <div className={styles.sectionHead}><span><Wrench aria-hidden="true" size={16} /> Tool outcomes</span></div>
            {currentRun?.toolCalls.length ? (
              <ul className={styles.toolLog}>
                {currentRun.toolCalls.map((tool) => (
                  <li key={tool.id}>
                    <span data-status={tool.status} />
                    <div><strong>{tool.title}</strong><small>{tool.status.replaceAll("_", " ")}</small></div>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.inspectorEmpty}>No tool calls in the current plan.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
