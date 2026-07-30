import Link from "next/link";

import { addOfferCommentAction, voteCommentAction } from "@/app/actions";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { formatPublicProfileLocation, type OfferCommentNode } from "@/lib/app-data";

interface CommentThreadProps {
  comments: OfferCommentNode[];
  offerId: string;
  returnTo: string;
  viewerId?: string | null;
}

interface CommentNodeProps extends CommentThreadProps {
  comment: OfferCommentNode;
}

function CommentNode({ comment, offerId, returnTo, viewerId }: CommentNodeProps) {
  const canReply = Boolean(viewerId) && comment.depth < 49;
  const canVote = Boolean(viewerId) && viewerId !== comment.author_id;
  const depthOffset = Math.min(comment.depth, 5) * 0.9;
  const authorLocation = comment.author ? formatPublicProfileLocation(comment.author) : null;

  return (
    <article className="comment-card" style={{ marginLeft: `${depthOffset}rem` }}>
      <header className="comment-head">
        <div>
          <p className="comment-author">
            {comment.author ? (
              <Link href={`/people/${comment.author.id}`}>{comment.author.resolvedName}</Link>
            ) : (
              "Member"
            )}
          </p>
          <p className="comment-meta">
            {authorLocation || "Public comment"}{" "}
            | <LocalDateTime value={comment.created_at} fallback="Date unavailable" />
          </p>
        </div>
        <div className="comment-score">
          <span className="badge badge-secondary">Karma impact {comment.score}</span>
          {canVote ? (
            <div className="comment-votes">
              <form action={voteCommentAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <input name="comment_id" type="hidden" value={comment.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <input name="value" type="hidden" value="1" />
                <button className="button button-secondary button-mini" type="submit">
                  {comment.viewerVote === 1 ? "Upvoted" : "Upvote"}
                </button>
              </form>
              <form action={voteCommentAction}>
                <input name="offer_id" type="hidden" value={offerId} />
                <input name="comment_id" type="hidden" value={comment.id} />
                <input name="return_to" type="hidden" value={returnTo} />
                <input name="value" type="hidden" value="-1" />
                <button className="button button-secondary button-mini" type="submit">
                  {comment.viewerVote === -1 ? "Downvoted" : "Downvote"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>

      <div className="comment-body">
        <p>{comment.body}</p>
      </div>

      {canReply ? (
        <form action={addOfferCommentAction} className="comment-reply-form">
          <input name="offer_id" type="hidden" value={offerId} />
          <input name="parent_id" type="hidden" value={comment.id} />
          <input name="return_to" type="hidden" value={returnTo} />
          <label className="field">
            <span>Reply</span>
            <textarea
              name="body"
              placeholder="Add a reply that clarifies your premise, objection, or constraint."
              rows={3}
            />
          </label>
          <div className="form-actions">
            <button className="button button-secondary button-mini" type="submit">
              Reply
            </button>
          </div>
        </form>
      ) : null}

      {comment.replies.length ? (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              offerId={offerId}
              returnTo={returnTo}
              viewerId={viewerId}
              comments={[]}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CommentThread({ comments, offerId, returnTo, viewerId }: CommentThreadProps) {
  if (!comments.length) {
    return (
      <div className="empty-state">
        <div>
          <strong>No public questions or comments yet.</strong>
          <p>Ask for a missing premise, evidence standard, boundary, or clarification.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      {comments.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          offerId={offerId}
          returnTo={returnTo}
          viewerId={viewerId}
          comments={comments}
        />
      ))}
    </div>
  );
}
