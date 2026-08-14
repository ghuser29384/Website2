export function hasSupabaseAuthCookie(cookies: ArrayLike<{ name: string }>) {
  return Array.from(cookies).some(({ name }) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
  );
}
