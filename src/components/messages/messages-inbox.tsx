import Link from "next/link";

import { LocalDateTime } from "@/components/ui/local-date-time";
import type { CoreThreadSummary } from "@/lib/core-trade-base";

import styles from "./messages-inbox.module.css";

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read_at: string | null;
}

const dateOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

function InboxDate({ value }: { value: string }) {
  return <LocalDateTime value={value} options={dateOptions} fallback="—" />;
}

export function MessagesInbox({
  threads,
  notifications,
  view,
  markReadAction,
}: {
  threads: CoreThreadSummary[];
  notifications: InboxNotification[];
  view: "conversations" | "updates";
  markReadAction: (formData: FormData) => Promise<void>;
}) {
  const unreadThreads = threads.filter((thread) => thread.unreadCount > 0).length;
  const unreadUpdates = notifications.filter((notification) => !notification.read_at).length;

  return (
    <section className={styles.inbox} aria-labelledby="messages-heading">
      <nav className={styles.tabs} aria-label="Message views">
        <Link href="/messages" aria-current={view === "conversations" ? "page" : undefined} scroll={false}>
          Conversations
          {unreadThreads > 0 ? <span className={styles.count} aria-label={`${unreadThreads} unread conversations`}>{unreadThreads}</span> : null}
        </Link>
        <Link href="/messages?view=updates" aria-current={view === "updates" ? "page" : undefined} scroll={false}>
          Updates
          {unreadUpdates > 0 ? <span className={styles.count} aria-label={`${unreadUpdates} unread recent updates`}>{unreadUpdates}</span> : null}
        </Link>
      </nav>
      {view === "conversations" ? (
        <>
          <div className={styles.listHeading}>
            <h2>Conversations <span>{threads.length}</span></h2>
            <span>Latest first</span>
          </div>
          {threads.length ? (
            <ul className={styles.list} aria-label="Conversations">
              {threads.map((thread) => {
                const name = thread.counterpart?.display_name || "Counterparty";
                return (
                  <li key={thread.id} className={`${styles.thread} ${thread.unreadCount ? styles.unread : ""}`}>
                    <Link href={`/messages/${thread.id}`} className={styles.threadLink}>
                      <span className={styles.avatar} aria-hidden="true">{Array.from(name.trim())[0]?.toLocaleUpperCase() || "?"}</span>
                      <div className={styles.threadText}>
                        <div className={styles.threadTop}>
                          <h3>{name}</h3>
                          <span className={styles.date}><InboxDate value={thread.lastMessageAt} /></span>
                        </div>
                        <p className={styles.subject}>{thread.offerTitle}</p>
                        <p className={styles.preview}>{thread.lastMessage}</p>
                      </div>
                      <span className={styles.chevron} aria-hidden="true">›</span>
                    </Link>
                    <div className={styles.threadMeta}>
                      {thread.unreadCount ? (
                        <span className={styles.unreadLabel}><span aria-hidden="true" />{thread.unreadCount} unread</span>
                      ) : (
                        <span className={styles.status}>{thread.status.replaceAll("_", " ")}</span>
                      )}
                      {thread.agreementId ? (
                        <Link className={styles.textLink} href={`/trade-agreements/${thread.agreementId}`}>
                          View agreement <span aria-hidden="true">↗</span>
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">↔</span>
              <h3>No conversations yet</h3>
              <p>Create a proposal and invite someone, or respond to an invitation.</p>
              <Link className={styles.primaryLink} href="/trades/new">Create a proposal</Link>
            </div>
          )}
          <p className={styles.privacy}>Conversations are visible only to participants and authorized operators.</p>
        </>
      ) : (
        <>
          <div className={styles.listHeading}>
            <h2>Recent updates</h2>
            <span>Latest 20</span>
          </div>
          {notifications.length ? (
            <ul className={styles.list} aria-label="Recent trade updates">
              {notifications.map((notification) => (
                <li className={`${styles.update} ${!notification.read_at ? styles.unread : ""}`} key={notification.id}>
                  <div className={styles.updateHeading}>
                    <h3>{notification.title}</h3>
                    <span className={styles.date}><InboxDate value={notification.created_at} /></span>
                  </div>
                  <p className={styles.updateBody}>{notification.body}</p>
                  <div className={styles.updateFooter}>
                    <span className={notification.read_at ? styles.status : styles.unreadLabel}>
                      {!notification.read_at ? <span aria-hidden="true" /> : null}
                      {notification.read_at ? "Read" : "Unread"}
                    </span>
                    <div className={styles.updateActions}>
                      {!notification.read_at ? (
                        <form action={markReadAction}>
                          <input name="notification_id" type="hidden" value={notification.id} />
                          <input name="return_to" type="hidden" value="/messages?view=updates" />
                          <button className={styles.quietButton} type="submit">Mark read</button>
                        </form>
                      ) : null}
                      <Link className={styles.textLink} href={notification.href}>View details <span aria-hidden="true">→</span></Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">✓</span>
              <h3>No trade updates yet</h3>
              <p>Invitations, confirmations, and other trade activity will appear here.</p>
            </div>
          )}
          <p className={styles.privacy}>Updates record trade activity. Open the details to check its current status.</p>
        </>
      )}
    </section>
  );
}
