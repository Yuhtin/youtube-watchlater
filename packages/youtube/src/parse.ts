export function parseDuration(isoDuration: string): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = match[1] ? parseInt(match[1], 10) : 0;
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const s = match[3] ? parseInt(match[3], 10) : 0;
  return h * 3600 + m * 60 + s;
}

export function parseVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const shortsMatch = url.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shortsMatch) return shortsMatch[1];
  } catch {
    return null;
  }
  return null;
}

export function parsePlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^(PL|UU|LL|FL|RD)[\w-]+$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const list = url.searchParams.get("list");
    return list && /^(PL|UU|LL|FL|RD)[\w-]+$/.test(list) ? list : null;
  } catch {
    return null;
  }
}
