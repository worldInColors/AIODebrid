import axios from "axios";
import {
  AddMagnetOptions,
  AddTorrentResult,
  AddUsenetOptions,
  AddUsenetResult,
  AddWebDownloadOptions,
  AddWebDownloadResult,
  DebridProvider,
  DownloadStatus,
  GetListOptions,
  TorrentStatus,
  UnifiedFile,
  UnifiedTorrent,
  UnifiedUsenet,
  UnifiedWebDownload,
  HosterInfo,
  UsenetProvider,
  User,
  WebDownloaderProvider,
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
export class TorBox
  implements DebridProvider, UsenetProvider, WebDownloaderProvider
{
  private apiKey: string;
  private baseUrl = "https://api.torbox.app/v1/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async addMagnet(
    magnetLink: string,
    options?: AddMagnetOptions
  ): Promise<AddTorrentResult> {
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
      const detail = res.data.detail || "";
      const isCached =
        detail.includes("Cached") || detail.toLowerCase().includes("cached");

      return {
        id: String(data.torrent_id),
        hash: data.hash,
        cached: isCached,
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

  async getTorrentsList(options?: GetListOptions): Promise<UnifiedTorrent[]> {
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
    options?: GetListOptions
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
  async checkCache(hashes: string[]): Promise<Record<string, boolean>> {
    return withErrorHandling(async () => {
      // 1. Remove duplicates first
      const uniqueHashes = [...new Set(hashes)];
      const chunks = [];

      // 2. Split into chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < uniqueHashes.length; i += chunkSize) {
        chunks.push(uniqueHashes.slice(i, i + chunkSize));
      }

      // 3. Execute all chunks in parallel
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const hashStr = chunk.join(",");
          try {
            const res = await axios.get(
              `${this.baseUrl}/torrents/checkcached`,
              {
                params: {
                  hash: hashStr,
                  format: "object",
                },
                headers: { Authorization: `Bearer ${this.apiKey}` },
              }
            );
            return res.data.data;
          } catch {
            // Silently return empty - hashes will be marked as not cached
            return {};
          }
        })
      );

      // 4. Merge all chunks
      const mergedData = Object.assign({}, ...results);
      const finalResult: Record<string, boolean> = {};

      // 5. Map back to the original request
      hashes.forEach((h) => {
        if (mergedData[h]) {
          finalResult[h] = true;
        } else {
          finalResult[h] = false;
        }
      });

      return finalResult;
    }, "TorBox");
  }

  async addUsenet(
    link: string,
    options?: AddUsenetOptions
  ): Promise<AddUsenetResult> {
    return withErrorHandling(async () => {
      const form = new FormData();
      form.append("link", link);

      if (options?.name !== undefined) {
        form.append("name", options.name);
      }
      if (options?.password !== undefined) {
        form.append("password", options.password);
      }
      if (options?.postProcessing !== undefined) {
        form.append("post_processing", String(options.postProcessing));
      }
      if (options?.asQueued !== undefined) {
        form.append("as_queued", String(options.asQueued));
      }
      if (options?.addOnlyIfCached !== undefined) {
        form.append("add_only_if_cached", String(options.addOnlyIfCached));
      }

      const res = await axios.post(
        `${this.baseUrl}/usenet/createusenetdownload`,
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
      const detail = res.data.detail || "";
      const isCached =
        detail.includes("Cached") || detail.toLowerCase().includes("cached");

      return {
        id: String(data.usenetdownload_id),
        hash: data.hash,
        cached: isCached,
      };
    }, "TorBox");
  }

  async getUsenetList(options?: GetListOptions): Promise<UnifiedUsenet[]> {
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

      const res = await axios.get(`${this.baseUrl}/usenet/mylist`, {
        params,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      const data = res.data.data;
      return data.map((download: any) => ({
        id: String(download.id),
        name: download.name,
        hash: download.hash,
        bytes: download.size,
        progress: download.progress * 100 || 0,
        status: this.normalizeDownloadStatus(download.download_state),
        speed: download.download_speed || 0,
        eta: download.eta,
      }));
    }, "TorBox");
  }

  async getUsenetDetails(
    downloadId: string,
    options?: GetListOptions
  ): Promise<UnifiedUsenet> {
    return withErrorHandling(async () => {
      const params: Record<string, string | boolean> = { id: downloadId };

      if (options?.bypassCache) {
        params.bypass_cache = true;
      }

      const res = await axios.get(`${this.baseUrl}/usenet/mylist`, {
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
        hash: data.hash,
        bytes: data.size,
        progress: data.progress * 100,
        status: this.normalizeDownloadStatus(data.download_state),
        speed: data.download_speed,
        eta: data.eta,
        files: data.files?.map((f: any) => ({
          id: String(f.id),
          name: f.name,
          size: f.size,
        })),
      };
    }, "TorBox");
  }

  async removeUsenet(downloadId: string): Promise<void> {
    return withErrorHandling(async () => {
      const res = await axios.post(
        `${this.baseUrl}/usenet/controlusenetdownload`,
        {
          usenet_id: downloadId,
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
  async checkUsenetCache(hashes: string[]): Promise<Record<string, boolean>> {
    return withErrorHandling(async () => {
      // 1. Remove duplicates first
      const uniqueHashes = [...new Set(hashes)];
      const chunks = [];

      // 2. Split into chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < uniqueHashes.length; i += chunkSize) {
        chunks.push(uniqueHashes.slice(i, i + chunkSize));
      }

      // 3. Execute all chunks in parallel
      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const hashStr = chunk.join(",");
          try {
            const res = await axios.get(`${this.baseUrl}/usenet/checkcached`, {
              params: {
                hash: hashStr,
                format: "object",
              },
              headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            return res.data.data;
          } catch {
            // Silently return empty - hashes will be marked as not cached
            return {};
          }
        })
      );

      // 4. Merge all chunks
      const mergedData = Object.assign({}, ...results);
      const finalResult: Record<string, boolean> = {};

      // 5. Map back to the original request
      hashes.forEach((h) => {
        if (mergedData[h]) {
          finalResult[h] = true;
        } else {
          finalResult[h] = false;
        }
      });

      return finalResult;
    }, "TorBox");
  }

  async addWebDownload(
    url: string,
    options?: AddWebDownloadOptions
  ): Promise<AddWebDownloadResult> {
    return withErrorHandling(async () => {
      const form = new FormData();
      form.append("link", url);

      if (options?.name !== undefined) {
        form.append("name", options.name);
      }
      if (options?.password !== undefined) {
        form.append("password", options.password);
      }
      if (options?.asQueued !== undefined) {
        form.append("as_queued", String(options.asQueued));
      }
      if (options?.addOnlyIfCached !== undefined) {
        form.append("add_only_if_cached", String(options.addOnlyIfCached));
      }

      const res = await axios.post(
        `${this.baseUrl}/webdl/createwebdownload`,
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
      const detail = res.data.detail || "";
      const isCached =
        detail.includes("Cached") || detail.toLowerCase().includes("cached");

      return {
        id: String(data.webdownload_id),
        hash: data.hash,
        cached: isCached,
      };
    }, "TorBox");
  }

  async getWebDownloadsList(
    options?: GetListOptions
  ): Promise<UnifiedWebDownload[]> {
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

      const res = await axios.get(`${this.baseUrl}/webdl/mylist`, {
        params,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");

      const data = res.data.data;
      return data.map((download: any) => ({
        id: String(download.id),
        hash: download.hash,
        originalUrl: download.original_url || "",
        name: download.name,
        bytes: download.size || 0,
        progress: (download.progress || 0) * 100,
        status: this.normalizeDownloadStatus(download.download_state),
        speed: download.download_speed || 0,
        eta: download.eta,
      }));
    }, "TorBox");
  }

  async getWebDownloadDetails(
    downloadId: string,
    options?: GetListOptions
  ): Promise<UnifiedWebDownload> {
    return withErrorHandling(async () => {
      const params: Record<string, string | boolean> = { id: downloadId };

      if (options?.bypassCache) {
        params.bypass_cache = true;
      }

      const res = await axios.get(`${this.baseUrl}/webdl/mylist`, {
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
        hash: data.hash,
        originalUrl: data.original_url || "",
        name: data.name,
        bytes: data.size || 0,
        progress: (data.progress || 0) * 100,
        status: this.normalizeDownloadStatus(data.download_state),
        speed: data.download_speed || 0,
        eta: data.eta,
        downloadUrl: data.download_url,
        files: data.files?.map((f: any) => ({
          id: String(f.id),
          name: f.name,
          size: f.size,
        })),
      };
    }, "TorBox");
  }

  async getUsenetLink(downloadId: string, fileId: string): Promise<string> {
    return withErrorHandling(async () => {
      const res = await axios.get(`${this.baseUrl}/usenet/requestdl`, {
        params: {
          token: this.apiKey,
          usenet_id: downloadId,
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

  async getWebDownloadLink(
    downloadId: string,
    fileId: string
  ): Promise<string> {
    return withErrorHandling(async () => {
      const res = await axios.get(`${this.baseUrl}/webdl/requestdl`, {
        params: {
          token: this.apiKey,
          web_id: downloadId,
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

  async removeWebDownload(downloadId: string): Promise<void> {
    return withErrorHandling(async () => {
      const res = await axios.post(
        `${this.baseUrl}/webdownloads/controlwebdownload`,
        {
          webdownload_id: downloadId,
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

  async checkWebDownloadCache(
    hashes: string[]
  ): Promise<Record<string, boolean>> {
    return withErrorHandling(async () => {
      const uniqueHashes = [...new Set(hashes)];
      const chunks: string[][] = [];
      const chunkSize = 100;

      for (let i = 0; i < uniqueHashes.length; i += chunkSize) {
        chunks.push(uniqueHashes.slice(i, i + chunkSize));
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const hashStr = chunk.join(",");
          try {
            const res = await axios.get(`${this.baseUrl}/webdl/checkcached`, {
              params: { hash: hashStr, format: "object" },
              headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            return res.data.data;
          } catch {
            // Silently return empty - hashes will be marked as not cached
            return {};
          }
        })
      );

      const mergedData = Object.assign({}, ...results);
      const finalResult: Record<string, boolean> = {};

      hashes.forEach((h) => {
        finalResult[h] = !!mergedData[h];
      });

      return finalResult;
    }, "TorBox");
  }

  async getHostersList(): Promise<HosterInfo[]> {
    return withErrorHandling(async () => {
      const res = await axios.get(`${this.baseUrl}/webdl/hosters`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        validateStatus: () => true,
      });

      handleApiResponse(res, "TorBox");
      const data = res.data.data || [];
      // Map to minimal HosterInfo shape for consistency across providers
      return data.map((h: any) => ({
        id: Number(h.id),
        name: h.name,
        domains: h.domains || [],
        url: h.url || undefined,
        icon: h.icon || undefined,
        status: typeof h.status === "boolean" ? h.status : !!h.status,
      }));
    }, "TorBox");
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Normalizes TorBox download status to unified DownloadStatus.
   * Used for usenet and web downloads.
   */
  private normalizeDownloadStatus(raw: string): DownloadStatus {
    if (!raw) return "error";
    const s = raw.toLowerCase();
    switch (s) {
      case "cached":
      case "download ready":
      case "download_ready":
        return "completed";
      case "downloading":
        return "downloading";
      case "procressing":
        return "processing";
      case "queued":
        return "queued";
      default:
        return "error";
    }
  }
  /**
   * Normalizes TorBox torrent status to unified TorrentStatus.
   */
  private normalizeStatus(raw: string): TorrentStatus {
    if (!raw) return "error";
    const s = raw.toLowerCase();
    switch (s) {
      case "cached":
      case "download ready":
      case "download_ready":
      case "completed":
        return "completed";
      case "downloading":
      case "uploading":
      case "metadl":
      case "checkingresumedata":
        return "downloading";
      case "seeding":
        return "seeding";
      case "paused":
      case "stalled (no seeds)":
        return "paused";
      case "queued":
        return "queued";
      default:
        return "error";
    }
  }
}
