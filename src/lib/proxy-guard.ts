/**
 * Path guard for /api/proxy. Only backend roots the vendor UI actually uses may
 * be proxied; everything else is refused even though the backend enforces its
 * own authz. Also rejects path-traversal segments.
 */
const ALLOWED_ROOTS = new Set(['vendor', 'me', 'notifications', 'auth']);

export function isSafeProxyPath(path: string[]): boolean {
  if (path.length === 0 || !ALLOWED_ROOTS.has(path[0])) return false;
  return path.every(
    (seg) => seg !== '' && seg !== '.' && seg !== '..' && !seg.includes('/') && !seg.includes('\\')
  );
}
