export const PLAYLIST_DEFAULT_SIZE = 100;
export const PLAYLIST_WARN_SIZE = 200;
export const PLAYLIST_MAX_SIZE = 500;

export function looksLikePlaylist(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/playlist" || parsed.searchParams.has("list");
  } catch {
    return false;
  }
}
