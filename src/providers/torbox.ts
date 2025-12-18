import axios from "axios";
import {
  AddMagnetOptions,
  DebridProvider,
  GetTorrentsListOptions,
  UnifiedTorrent,
  User,
} from "../interface";
import { handleApiResponse, withErrorHandling } from "../utils/errorHandler";
import FormData from "form-data";

/**
 * TorBox implementation of the DebridProvider interface.
 *
 * @example
 * ```typescript
 * const torbox = new TorBox('your-api-key');
 * const torrent = await torbox.addMagnet('magnet:?xt=...');
 * ```
 */
export class TorBox implements DebridProvider {
  private apiKey: string;
  private baseUrl = "https://api.torbox.app/v1/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async addMagnet(
    magnetLink: string,
    options?: AddMagnetOptions
  ): Promise<UnifiedTorrent> {
    return withErrorHandling(async () => {
      const form = new FormData();
      form.append("magnet", magnetLink);

      if (options?.seed !== undefined) {
        form.append("seed", String(options.seed));
      }
      if (options?.name !== undefined) {
        form.append("name", options.name);
      }
      if (options?.allowZip !== undefined) {
        form.append("allow_zip", String(options.allowZip));
      }
      if (options?.asQueued !== undefined) {
        form.append("as_queued", String(options.asQueued));
      }
      if (options?.addOnlyIfCached !== undefined) {
        form.append("add_only_if_cached", String(options.addOnlyIfCached));
      }

      const res = await axios.post(
        `${this.baseUrl}/torrents/createtorrent`,
        form,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...form.getHeaders(),
          },
          validateStatus: () => true,
        }
      );

      handleApiResponse(res, "TorBox");

      const data = res.data.data;
      const isCached = res.data.detail?.includes("Cached Torrent");

      return {
        id: String(data.torrent_id),
        name: data.name || options?.name || "Unknown",
        bytes: 0,
        hash: data.hash,
        progress: isCached ? 100 : 0,
        speed: 0,
        status: isCached ? "completed" : "downloading",
      };
    }, "TorBox");
  }

  async getUserInfo(): Promise<User> {
    return withErrorHandling(async () => {
      const res = await axios.get(`${this.baseUrl}/user/me`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      const data = res.data.data;

      return {
        username: data.email,
        isPremium: data.plan !== 0,
        premiumExpiry: new Date(data.premium_expires_at),
      };
    }, "TorBox");
  }

  async getLink(torrentId: string, fileId: string): Promise<string> {
    return withErrorHandling(async () => {
      const res = await axios.get(`${this.baseUrl}/torrents/requestdl`, {
        params: {
          token: this.apiKey,
          torrent_id: torrentId,
          file_id: fileId,
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      return res.data.data;
    }, "TorBox");
  }

  async removeTorrent(torrentId: string): Promise<void> {
    return withErrorHandling(async () => {
      const res = await axios.post(
        `${this.baseUrl}/torrents/controltorrent`,
        {
          torrent_id: torrentId,
          operation: "delete",
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          validateStatus: () => true,
        }
      );

      handleApiResponse(res, "TorBox");
    }, "TorBox");
  }
  async getTorrentsList(
    options?: GetTorrentsListOptions
  ): Promise<UnifiedTorrent[]> {
    return withErrorHandling(async () => {
      const params: Record<string, string | boolean> = {};

      if (options?.offset !== undefined) {
        params.offset = String(options.offset);
      }
      if (options?.limit !== undefined) {
        params.limit = String(options.limit);
      }
      if (options?.bypassCache) {
        params.bypass_cache = true;
      }

      const res = await axios.get(`${this.baseUrl}/torrents/mylist`, {
        params,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      const data = res.data.data;
      return data.map((torrent: any) => ({
        id: String(torrent.id),
        name: torrent.name,
        bytes: torrent.size,
        hash: torrent.hash,
        progress: torrent.progress * 100,
        status: this.normalizeStatus(torrent.download_state),
        speed: torrent.download_speed,
        seeds: torrent.seeds,
        peers: torrent.peers,
        eta: torrent.eta,
      }));
    }, "TorBox");
  }

  async getTorrentDetails(
    torrentId: string,
    options?: GetTorrentsListOptions
  ): Promise<UnifiedTorrent> {
    return withErrorHandling(async () => {
      const params: Record<string, string | boolean> = { id: torrentId };

      if (options?.bypassCache) {
        params.bypass_cache = true;
      }
      const res = await axios.get(`${this.baseUrl}/torrents/mylist`, {
        params,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      const data = res.data.data;
      return {
        id: String(data.id),
        name: data.name,
        bytes: data.size,
        hash: data.hash,
        progress: data.progress * 100,
        status: this.normalizeStatus(data.download_state),
        speed: data.download_speed,
        files: data.files
          ? data.files.map((f: any) => ({
              id: String(f.id),
              name: f.name,
              size: f.size,
            }))
          : [],
      };
    }, "TorBox");
  }

  private normalizeStatus(raw: string): UnifiedTorrent["status"] {
    switch (raw) {
      case "cached":
      case "completed":
        return "completed";
      case "downloading":
      case "uploading":
      case "metaDL":
      case "checkingResumeData":
        return "downloading";
      case "paused":
      case "stalled (no seeds)":
        return "paused";
      default:
        return "error";
    }
  }
}
