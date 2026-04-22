export function isCronRequestAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const url = new URL(request.url);

  return (
    authorization === `Bearer ${secret}` ||
    url.searchParams.get("secret") === secret
  );
}
