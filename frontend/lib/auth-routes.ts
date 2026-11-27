export const PUBLIC_PATHS = [
  "/login",
  "/invitations/accept-invitation",
] as const;

export function isPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
