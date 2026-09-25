"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { completeWalkthroughProfileAction } from "@/app/complete-profile/actions";
import { validateProfileUsername } from "@/lib/profile-username";
import { createClient } from "@/lib/supabase/browser";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  clearProfileDraft, emptyProfileSetupValues, encodeProfileDraft, importGuestProfileNotes,
  PROFILE_SETUP_LIMITS, profileDraftKey, readProfileDraft,
  type ProfileDraftEnvelope, type ProfileSetupValues,
} from "@/lib/profile-setup-draft";
import { ProfilePrioritiesCard } from "./profile-priorities-card";
import styles from "./profile-setup.module.css";

interface CompleteProfileReviewProps {
  accountId: string | null;
  accountEmail: string;
  initialAffiliation: string;
  initialBio: string;
  initialDisplayName: string;
  initialUsername: string;
  initialPublicInvitationMentionsEnabled: boolean;
  loginHref: string;
  returnTo: string;
  signupHref: string;
  successTo: string;
  storageAvailable: boolean;
}
function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className={styles.primary} disabled={disabled || pending} type="submit">
    {pending ? "Saving profile…" : "Save profile & explore"}
  </button>;
}

export function CompleteProfileReview({ accountId, accountEmail, initialAffiliation, initialBio,
  initialDisplayName, initialUsername, initialPublicInvitationMentionsEnabled,
  loginHref, returnTo, signupHref, successTo, storageAvailable }: CompleteProfileReviewProps) {
  const initial = (): ProfileSetupValues => ({ ...emptyProfileSetupValues(), displayName: initialDisplayName,
    username: initialUsername, affiliation: initialAffiliation, bio: initialBio });
  const [values, setValues] = useState<ProfileSetupValues>(initial);
  const [remember, setRemember] = useState(false);
  const [ready, setReady] = useState(false);
  const [savedDraft, setSavedDraft] = useState<ProfileDraftEnvelope | null>(null);
  const [guestDraft, setGuestDraft] = useState<ProfileDraftEnvelope | null>(null);
  const [savePreferences, setSavePreferences] = useState(false);
  const [publicMentions, setPublicMentions] = useState(initialPublicInvitationMentionsEnabled);
  const [message, setMessage] = useState("");
  const [accountChanged, setAccountChanged] = useState(false);

  useEffect(() => {
    // Read device state after hydration, and cancel stale reads on account remount.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setSavedDraft(readProfileDraft(window.localStorage, accountId));
        setGuestDraft(accountId ? readProfileDraft(window.localStorage, null) : null);
      } catch { setMessage("Device draft storage is unavailable. You can still edit and save your profile."); }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [accountId]);

  useEffect(() => {
    if (!ready || !remember || accountChanged) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try { window.localStorage.setItem(profileDraftKey(accountId), encodeProfileDraft(accountId, values)); }
      catch { setRemember(false); setMessage("The draft could not be saved on this device. Your edits are still in this tab."); }
    });
    return () => { cancelled = true; };
  }, [accountId, values, ready, remember, accountChanged]);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if ((session?.user.id ?? null) !== accountId) {
        setAccountChanged(true);
        setRemember(false);
        setValues(emptyProfileSetupValues());
        setSavedDraft(null);
        setGuestDraft(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [accountId]);

  function update(key: keyof ProfileSetupValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  function discardDraft() {
    try { clearProfileDraft(window.localStorage, accountId); }
    catch { setMessage("This browser did not allow draft removal. Clear this site's storage in browser settings."); return; }
    setRemember(false); setSavedDraft(null); setValues(initial()); setSavePreferences(false); setPublicMentions(initialPublicInvitationMentionsEnabled);
    setMessage("Device draft cleared. No saved account records were deleted.");
  }
  function restoreDraft() {
    // Recheck expiry at the moment of restoration, not just at initial page load.
    try {
      const draft = readProfileDraft(window.localStorage, accountId);
      if (!draft) { setSavedDraft(null); setMessage("That draft has expired or is no longer available."); return; }
      setValues(draft.values); setRemember(true); setSavedDraft(null); setSavePreferences(false);
      setMessage("Draft restored for this account. Review it before saving; publication settings were not imported.");
    } catch { setMessage("The draft could not be restored."); }
  }
  function importGuest() {
    try {
      const guest = readProfileDraft(window.localStorage, null);
      if (!guest) { setGuestDraft(null); setMessage("The guest draft is no longer available."); return; }
      setValues((current) => importGuestProfileNotes(current, guest.values));
      clearProfileDraft(window.localStorage, null); setGuestDraft(null); setSavePreferences(false);
      setMessage("Guest notes imported by your choice. Account identity and publication settings were not changed.");
    } catch { setMessage("Guest notes could not be imported."); }
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const username = validateProfileUsername(values.username);
    if (!accountId || accountChanged || !ready || !storageAvailable || !username.ok || values.displayName.trim().length < 2) {
      event.preventDefault();
      setMessage(accountChanged ? "Your account changed. Reload before editing or saving."
        : !username.ok ? username.message : "Enter a display name and sign in before saving.");
    }
  }

  if (accountChanged) return <section className={styles.setup} role="alert">
    <h1>Account changed</h1><p>This tab&apos;s previous profile values have been cleared. Reload to edit the current account.</p>
    <a href={returnTo}>Reload profile setup</a>
  </section>;

  return <section className={styles.setup} aria-labelledby="complete-profile-heading" data-profile-setup-owner={accountId ? "member" : "guest"}>
    <header className={styles.header}>
      <Link href="/" prefetch={false} aria-label="Moral Trade home" className={styles.brand}>Moral Trade</Link>
      <Link href="/discover" prefetch={false}>Browse trades</Link>
    </header>
    <div className={styles.intro}><p className={styles.eyebrow}>Your account</p>
      <h1 id="complete-profile-heading">Set up your profile.</h1>
      <p>A name and username are enough. Matching preferences are optional; no tour or priority allocation is required.</p>
      <Link href={successTo} prefetch={false}>Skip setup and browse</Link>
    </div>
    <ProfilePrioritiesCard returnTo={returnTo} />
    <form action={completeWalkthroughProfileAction} onSubmit={handleSubmit}>
      <input type="hidden" name="profile_owner_id" value={accountId ?? ""} />
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="success_to" value={successTo} />
      <input type="hidden" name="profile_setup_version" value="2" />
      <input type="hidden" name="public_invitation_mentions_enabled" value={String(publicMentions)} />
      {savedDraft ? <div className={styles.notice} role="status">
        <p>A device draft is available for {accountId ? "this account" : "this guest session"}. It is not a saved account record.</p>
        <button type="button" onClick={restoreDraft}>Restore this draft</button>{" "}
        <button type="button" onClick={discardDraft}>Discard device draft</button>
      </div> : null}
      {guestDraft ? <div className={styles.notice}>
        <p>Guest matching notes exist on this device. They will not be imported automatically.</p>
        <button type="button" onClick={importGuest}>Import guest matching notes</button>{" "}
        <button type="button" onClick={() => { try { clearProfileDraft(window.localStorage, null); setGuestDraft(null); } catch { setMessage("Guest draft could not be cleared."); } }}>Discard guest draft</button>
      </div> : null}
      <div className={styles.fields}>
        <label>Display name<input name="display_name" autoComplete="name" maxLength={80} required minLength={2}
          value={values.displayName} onChange={(e) => update("displayName", e.target.value)} /></label>
        <label>Username<input aria-label="Username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false}
          maxLength={32} minLength={2} required pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
          value={values.username} onChange={(e) => update("username", e.target.value.toLowerCase().replace(/^@+/u, ""))} />
          <small>Unique and public. Existing accounts are not assigned a generated username.</small></label>
        <label>Company, organization, or university (optional)<input name="affiliation" autoComplete="organization" maxLength={160}
          value={values.affiliation} onChange={(e) => update("affiliation", e.target.value)} /></label>
        <label>Profile introduction (optional)<textarea aria-label="Profile introduction (optional)" aria-describedby="profile-bio-help" name="bio" maxLength={500} value={values.bio}
          onChange={(e) => update("bio", e.target.value)} /><small id="profile-bio-help">Public profile introduction. Keep sensitive information in private matching notes instead.</small></label>
      </div>
      {accountId ? <p className={styles.account}>Signed in as {accountEmail}. Account email is not stored in device drafts.</p> :
        <p className={styles.notice}>You can browse without an account. Sign in to save these details; any guest draft stays separate until you explicitly import its matching notes.</p>}
      <details className={styles.personalization}>
        <summary>Optional private matching preferences</summary>
        <p>Describe your own priorities, including outcomes outside the suggested cause categories. New text is added to saved matching notes; existing constraints are not erased. Blank fields leave preferences unchanged. These notes do not publish an offer or enable outreach.</p>
        <div className={styles.fields}>
          <label>Outcomes I care about<textarea aria-label="Outcomes I care about" name="outcomes" maxLength={PROFILE_SETUP_LIMITS.outcomes} value={values.outcomes}
            onChange={(e) => update("outcomes", e.target.value)} /></label>
          <label>What I can offer<textarea aria-label="What I can offer" name="capabilities" maxLength={PROFILE_SETUP_LIMITS.capabilities} value={values.capabilities}
            onChange={(e) => update("capabilities", e.target.value)} /></label>
          <label>Limits or exclusions<textarea aria-label="Limits or exclusions" aria-describedby="profile-limits-help" name="limits" maxLength={PROFILE_SETUP_LIMITS.limits} value={values.limits}
            onChange={(e) => update("limits", e.target.value)} /><small id="profile-limits-help">Leave time and monetary limits unspecified unless you have chosen them.</small></label>
        </div>
        <label className={styles.check}><input type="checkbox" name="save_preferences" checked={savePreferences}
          onChange={(e) => setSavePreferences(e.target.checked)} />Save the private matching notes I entered</label>
        <p>Skipping this step preserves existing preferences and priority allocations. Private notes require encrypted account storage.</p>
      </details>
      <details className={styles.personalization}>
        <summary>Public invitation setting</summary>
        <label className={styles.check}><input type="checkbox" checked={publicMentions} onChange={(e) => setPublicMentions(e.target.checked)} />Show my username on public pending invitations</label>
        <p>This does not publish a private wish or change the visibility of your existing matching profile.</p>
      </details>
      <section className={styles.device} aria-label="Device draft controls">
        <label className={styles.check}><input type="checkbox" checked={remember} disabled={!ready}
          onChange={(e) => { const enabled = e.target.checked; setRemember(enabled); if (!enabled) { try { clearProfileDraft(window.localStorage, accountId); } catch { setMessage("Draft could not be removed from this browser."); } } }} />Remember this draft for 24-hour recovery</label>
        <p>Off by default. Device drafts are not encrypted and may be accessible to someone using this browser. Recovery expires after 24 hours; expired drafts are removed when this page next checks storage. Drafts are separated by account and never carry publication consent. Avoid this on shared devices.</p>
        <button type="button" onClick={discardDraft}>Clear device draft and reset edits</button>
      </section>
      {message ? <p role="status" className={styles.notice}>{message}</p> : null}
      <footer className={styles.actions}>
        {accountId ? <SubmitButton disabled={!ready || !storageAvailable} /> : <>
          <Link className={styles.primary} href={signupHref}>Create account & continue</Link>
          <Link href={loginHref}>Sign in</Link>
        </>}
        <span>Saving does not create a commitment, reserve money, or contact anyone.</span>
      </footer>
    </form>
  </section>;
}
