import { parseDuration } from "./parse";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  url: string;
  channelId?: string;
  channelTitle?: string;
}

export interface YouTubePlaylist {
  playlistId: string;
  title: string;
  thumbnailUrl: string;
}

export class YouTubeApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

function pickThumb(thumbs: Record<string, { url: string }> | undefined, fallback: string): string {
  if (!thumbs) return fallback;
  return thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? fallback;
}

export class YouTubeClient {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("YouTubeClient requires a non-empty apiKey");
    }
  }

  private async call<T>(path: string, params: Record<string, string>): Promise<T> {
    const search = new URLSearchParams({ ...params, key: this.apiKey });
    const res = await fetch(`${YT_BASE}/${path}?${search.toString()}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new YouTubeApiError(res.status, `YouTube API ${path} failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async getVideo(videoId: string): Promise<YouTubeVideo | null> {
    type Resp = {
      items?: Array<{
        id: string;
        snippet: { title: string; thumbnails?: Record<string, { url: string }>; channelId?: string; channelTitle?: string };
        contentDetails?: { duration?: string };
      }>;
    };
    const data = await this.call<Resp>("videos", {
      part: "snippet,contentDetails",
      id: videoId,
    });
    const item = data.items?.[0];
    if (!item) return null;
    return {
      videoId: item.id,
      title: item.snippet.title,
      thumbnailUrl: pickThumb(item.snippet.thumbnails, `https://img.youtube.com/vi/${videoId}/0.jpg`),
      durationSeconds: parseDuration(item.contentDetails?.duration ?? ""),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
    };
  }

  async getVideosByIds(videoIds: string[]): Promise<Map<string, YouTubeVideo>> {
    const out = new Map<string, YouTubeVideo>();
    if (videoIds.length === 0) return out;
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      type Resp = {
        items?: Array<{
          id: string;
          snippet: { title: string; thumbnails?: Record<string, { url: string }>; channelId?: string; channelTitle?: string };
          contentDetails?: { duration?: string };
        }>;
      };
      const data = await this.call<Resp>("videos", {
        part: "snippet,contentDetails",
        id: batch.join(","),
      });
      for (const item of data.items ?? []) {
        out.set(item.id, {
          videoId: item.id,
          title: item.snippet.title,
          thumbnailUrl: pickThumb(item.snippet.thumbnails, `https://img.youtube.com/vi/${item.id}/0.jpg`),
          durationSeconds: parseDuration(item.contentDetails?.duration ?? ""),
          url: `https://www.youtube.com/watch?v=${item.id}`,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
        });
      }
    }
    return out;
  }

  async getPlaylist(playlistId: string): Promise<YouTubePlaylist | null> {
    type Resp = {
      items?: Array<{
        id: string;
        snippet: { title: string; thumbnails?: Record<string, { url: string }> };
      }>;
    };
    const data = await this.call<Resp>("playlists", {
      part: "snippet",
      id: playlistId,
    });
    const item = data.items?.[0];
    if (!item) return null;
    return {
      playlistId: item.id,
      title: item.snippet.title,
      thumbnailUrl: pickThumb(item.snippet.thumbnails, ""),
    };
  }

  async getPlaylistItems(playlistId: string): Promise<YouTubeVideo[]> {
    type ItemsResp = {
      nextPageToken?: string;
      items?: Array<{
        snippet: { title: string; thumbnails?: Record<string, { url: string }> };
        contentDetails: { videoId: string };
      }>;
    };

    const videoIds: string[] = [];
    let pageToken: string | undefined;
    do {
      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50",
      };
      if (pageToken) params.pageToken = pageToken;
      const data = await this.call<ItemsResp>("playlistItems", params);
      for (const item of data.items ?? []) {
        videoIds.push(item.contentDetails.videoId);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    const detailsMap = await this.getVideosByIds(videoIds);
    return videoIds
      .map((id) => detailsMap.get(id))
      .filter((v): v is YouTubeVideo => v != null);
  }
}
