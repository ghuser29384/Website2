interface PublicProfileTrustInput {
  resolvedName: string;
  offerCount: number;
  rating: number | null;
  ratingCount: number;
  verificationBadges: Array<{ badge_type: string }>;
  wishPreview: string | null;
  wishCauses: string[];
}

interface PublicProfileTrustOptions {
  authoredCommentCount?: number;
  publicLocation?: string | null;
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function getPublicProfileTrustSignals(
  profile: PublicProfileTrustInput,
  options: PublicProfileTrustOptions = {},
) {
  const signals: string[] = [];
  const publicLocation = options.publicLocation?.trim();

  if (publicLocation) {
    signals.push(publicLocation);
  }

  if (profile.offerCount > 0) {
    signals.push(formatCount(profile.offerCount, "open offer"));
  }

  if (profile.verificationBadges.length > 0) {
    signals.push(formatCount(profile.verificationBadges.length, "reviewed proof badge"));
  }

  if (profile.ratingCount > 0) {
    signals.push(
      `${(profile.rating ?? 0).toFixed(1)}/10 from ${formatCount(
        profile.ratingCount,
        "reviewed rating",
      )}`,
    );
  }

  if ((options.authoredCommentCount ?? 0) > 0) {
    signals.push(formatCount(options.authoredCommentCount ?? 0, "public comment"));
  }

  if (profile.wishPreview || profile.wishCauses.length > 0) {
    signals.push("broad wish preview visible");
  }

  return signals;
}

export function getPublicProfileMetaSummary(
  profile: PublicProfileTrustInput,
  options: PublicProfileTrustOptions = {},
) {
  const signals = getPublicProfileTrustSignals(profile, options);

  if (signals.length > 0) {
    return `${profile.resolvedName}. ${signals.join(". ")}.`;
  }

  return `${profile.resolvedName}. Opt-in public Moral Trade profile; reviewable records are not public yet.`;
}
