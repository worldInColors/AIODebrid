// ============================================================================
// Common Types
// ============================================================================

/**
 * Represents a file within a torrent, usenet download, or web download.
 */
export interface UnifiedFile {
  /** Unique identifier for the file */
  id: string;
  /** Name of the file including extension */
  name: string;
  /** Size of the file in bytes */
  size: number;
}

/**
 * Common download status values shared across all download types.
 */
export type DownloadStatus =
  | "downloading"
  | "processing"
  | "completed"
  | "error"
  | "queued";

/**
 * Extended status for torrents that includes seeding and paused states.
 */
export type TorrentStatus = DownloadStatus | "seeding" | "paused";

// ============================================================================
// Add Result Types (returned immediately after adding)
// ============================================================================

/**
 * Result returned immediately after adding a torrent.
 *
 * @remarks
 * When adding a torrent, the provider only returns minimal information:
 * - `id` and `hash` are always available
 * - `cached` indicates if the torrent is already on the provider's servers
 *
 * **Even when cached, name/size/files are NOT returned.**
 * You must call `getTorrentDetails()` to get the full information.
 *
 * @example
 * ```typescript
 * const result = await provider.addMagnet('magnet:?xt=...');
 *
 * if (result.cached) {
 *   // Instant download available, but we need details
 *   const details = await provider.getTorrentDetails(result.id);
 *   console.log(`Ready: ${details.name}`);
 * } else {
 *   // Still downloading, poll for status
 *   const details = await provider.getTorrentDetails(result.id);
 *   console.log(`Progress: ${details.progress}%`);
 * }
 * ```
 */
export interface AddTorrentResult {
  /** Unique identifier for the torrent */
  id: string;
  /** Info hash of the torrent */
  hash: string;
  /** Whether the torrent was found in the provider's cache (instant download) */
  cached: boolean;
}

/**
 * Result returned immediately after adding a usenet download.
 *
 * @remarks
 * Similar to torrents, the provider only returns minimal information:
 * - `id` and `hash` are always available
 * - `cached` indicates if the download is already on the provider's servers
 *
 * **Even when cached, name/size/files are NOT returned.**
 * You must call `getUsenetDetails()` to get the full information.
 *
 * @example
 * ```typescript
 * const result = await provider.addUsenet('https://example.com/file.nzb');
 *
 * // Always need to fetch details to get name/size
 * const details = await provider.getUsenetDetails(result.id);
 * console.log(`${result.cached ? 'Cached' : 'Downloading'}: ${details.name}`);
 * ```
 */
export interface AddUsenetResult {
  /** Unique identifier for the download */
  id: string;
  /** Hash of the usenet download */
  hash: string;
  /** Whether the download was found in the provider's cache (instant download) */
  cached: boolean;
}

/**
 * Result returned immediately after adding a web download.
 *
 * @remarks
 * Web downloads (hosters, direct links) also only return minimal information:
 * - `id` and `hash` are always available
 * - `cached` indicates if the download is already on the provider's servers
 *
 * **Even when cached, name/size/files are NOT returned.**
 * You must call `getWebDownloadDetails()` to get the full information.
 *
 * @example
 * ```typescript
 * const result = await provider.addWebDownload('https://mega.nz/...');
 *
 * // Always need to fetch details to get name/size
 * const details = await provider.getWebDownloadDetails(result.id);
 * console.log(`${result.cached ? 'Cached' : 'Downloading'}: ${details.name}`);
 * ```
 */
export interface AddWebDownloadResult {
  /** Unique identifier for the web download */
  id: string;
  /** Hash of the web download */
  hash: string;
  /** Whether the download was found in the provider's cache (instant download) */
  cached: boolean;
}

// ============================================================================
// Full Detail Types (returned when fetching/listing)
// ============================================================================

/**
 * Represents a torrent with full normalized properties across providers.
 *
 * @remarks
 * This is returned by `getTorrentDetails()` and `getTorrentsList()` where
 * the full information is available.
 */
export interface UnifiedTorrent {
  /** Unique identifier for the torrent */
  id: string;
  /** Name of the torrent */
  name: string;
  /** Total size in bytes */
  bytes: number;
  /** Info hash of the torrent */
  hash: string;
  /** Download progress from 0 to 100 */
  progress: number;
  /** Current status of the torrent */
  status: TorrentStatus;
  /** Current download/upload speed in bytes per second */
  speed: number;
  /** Number of seeds (optional) */
  seeds?: number;
  /** Number of peers (optional) */
  peers?: number;
  /** Estimated time remaining in seconds (optional) */
  eta?: number;
  /** List of files in the torrent (optional, included in details) */
  files?: UnifiedFile[];
}

/**
 * Represents a Usenet download with full normalized properties across providers.
 *
 * @remarks
 * This is returned by `getUsenetDetails()` and `getUsenetList()` where
 * the full information is available.
 */
export interface UnifiedUsenet {
  /** Unique identifier for the download */
  id: string;
  /** Name of the download */
  name: string;
  /** Hash of the usenet download */
  hash: string;
  /** Total size in bytes */
  bytes: number;
  /** Download progress from 0 to 100 */
  progress: number;
  /** Current status of the download */
  status: DownloadStatus;
  /** Current download speed in bytes per second */
  speed: number;
  /** Estimated time remaining in seconds (optional) */
  eta?: number;
  /** List of files in the download (optional, included in details) */
  files?: UnifiedFile[];
  /** Whether download needs password (optional) */
  passwordRequired?: boolean;
}

/**
 * Represents a web download (hoster link) with full normalized properties.
 *
 * @remarks
 * This is returned by `getWebDownloadDetails()` and `getWebDownloadsList()`.
 * Used for services that "unrestrict" links (e.g. Rapidgator, Mega, YouTube).
 */
export interface UnifiedWebDownload {
  /** Unique identifier for the web download */
  id: string;
  /** Hash of the web download */
  hash: string;
  /** The original URL passed to the provider */
  originalUrl: string;
  /** The direct, unrestricted download URL (if ready) */
  downloadUrl?: string;
  /** Filename of the download */
  name: string;
  /** Total size in bytes */
  bytes: number;
  /** Download progress from 0 to 100 */
  progress: number;
  /** Current status of the download */
  status: DownloadStatus;
  /** Current download speed in bytes per second */
  speed: number;
  /** Estimated time remaining in seconds (optional) */
  eta?: number;
  /** List of files in the download (for archives, optional) */
  files?: UnifiedFile[];
}

/**
 * Minimal information about a supported hoster returned by providers' hoster lists.
 *
 * @remarks
 * Providers may include many fields, but for compatibility we only expose a
 * minimal common subset so other providers can implement this as well.
 *
 * Required (minimal): `id`, `name`, `domains`, `url`, `icon`, `status`
 */
export interface HosterInfo {
  /** Numeric ID assigned by the provider */
  id: number;
  /** Display name (e.g., "Transfer.it") */
  name: string;
  /** Known domains for this hoster */
  domains: string[];
  /** Public website URL for the hoster */
  url?: string;
  /** Icon (small image) URL for UI use */
  icon?: string;
  /** Whether the hoster is currently enabled/supported */
  status?: boolean;
}
// ============================================================================
// User & Account Types
// ============================================================================

/**
 * Represents user account information from a debrid provider.
 */
export interface User {
  /** Username or email address */
  username: string;
  /** Whether the user has an active premium subscription */
  isPremium: boolean;
  /** When the premium subscription expires (optional) */
  premiumExpiry?: Date;
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for adding a magnet link to the debrid service.
 */
export interface AddMagnetOptions {
  /**
   * Custom name for the torrent.
   * @remarks Supported by: TorBox, Real-Debrid
   */
  name?: string;

  /**
   * Control seeding behavior.
   * - 1 = Auto
   * - 2 = Seed
   * - 3 = Don't Seed
   *
   * @remarks Only supported by **TorBox**
   */
  seed?: number;

  /**
   * If true, allows zipping files larger than the provider's limit.
   * @remarks Only supported by **TorBox**
   */
  allowZip?: boolean;

  /**
   * If true, queues the torrent instantly (bypassed for free users).
   * @remarks Only supported by **TorBox**
   */
  asQueued?: boolean;

  /**
   * If true, only adds the torrent if it's already cached on the service.
   * @remarks Only supported by **TorBox**
   */
  addOnlyIfCached?: boolean;
}

/**
 * Options for adding Usenet/NZB content.
 */
export interface AddUsenetOptions {
  /** Custom name for the download */
  name?: string;

  /** Password for protected archives */
  password?: string;

  /**
   * Post-processing mode:
   * - `-1` = Default (extract only)
   * - `0` = None
   * - `1` = Repair
   * - `2` = Repair + Unpack
   * - `3` = Repair + Unpack + Delete
   *
   * @default -1
   */
  postProcessing?: number;

  /**
   * Queue instantly (bypassed for free users).
   * @remarks Only supported by **TorBox**
   */
  asQueued?: boolean;

  /**
   * Only add if cached on the service.
   * @remarks Only supported by **TorBox**
   */
  addOnlyIfCached?: boolean;
}

/**
 * Options for adding a web download (hoster/direct link).
 */
export interface AddWebDownloadOptions {
  /** Custom name for the download */
  name?: string;

  /** Password for protected archives */
  password?: string;

  /**
   * Queue instantly (bypassed for free users).
   * @remarks Only supported by **TorBox**
   */
  asQueued?: boolean;

  /**
   * Only add if cached on the service.
   * @remarks Only supported by **TorBox**
   */
  addOnlyIfCached?: boolean;
}

/**
 * Options for retrieving lists of downloads.
 *
 * @remarks Used for torrents, usenet, and web downloads.
 */
export interface GetListOptions {
  /**
   * If true, bypasses the provider's cache and fetches fresh data.
   * @remarks May be slower but returns the most up-to-date information.
   */
  bypassCache?: boolean;

  /** Number of items to skip (for pagination) */
  offset?: number;

  /** Maximum number of items to return */
  limit?: number;
}

/**
 * Universal interface for debrid service providers.
 * Implementations must provide consistent behavior across different services.
 *
 * @example
 * ```typescript
 * // Using with TorBox
 * const torbox: DebridProvider = new TorBox('api-key');
 *
 * // Using with RealDebrid
 * const rd: DebridProvider = new RealDebrid('api-key');
 *
 * // Both work the same way
 * const torrent = await torbox.addMagnet('magnet:?xt=...');
 * ```
 */
export interface DebridProvider {
  /**
   * Adds a magnet link to the debrid service for downloading.
   *
   * @remarks
   * The returned `AddTorrentResult` contains minimal information.
   * - `name`, `bytes`, and `files` are **only available if cached**.
   * - For non-cached torrents, use `getTorrentDetails()` to get full info once processing completes.
   *
   * @param magnetLink - The magnet URI to add (must start with "magnet:?")
   * @param options - Optional configuration for the torrent
   * @returns A promise resolving to the add result with cache status
   * @throws {DebridError} If the magnet link is invalid or the request fails
   *
   * @example
   * ```typescript
   * const result = await provider.addMagnet('magnet:?xt=urn:btih:...', {
   *   name: 'My Movie',
   *   addOnlyIfCached: true
   * });
   *
   * if (result.cached) {
   *   console.log(`Instant download: ${result.name}`);
   * } else {
   *   // Poll for details
   *   const details = await provider.getTorrentDetails(result.id);
   * }
   * ```
   */
  addMagnet(
    magnetLink: string,
    options?: AddMagnetOptions
  ): Promise<AddTorrentResult>;

  /**
   * Retrieves a list of all torrents in the user's account.
   *
   * @param options - Optional pagination and caching parameters
   * @returns A promise resolving to an array of torrent details
   * @throws {DebridError} If the request fails or authentication is invalid
   *
   * @example
   * ```typescript
   * // Get first 50 torrents
   * const torrents = await provider.getTorrentsList({
   *   limit: 50,
   *   offset: 0,
   *   bypassCache: false
   * });
   *
   * // Filter active downloads
   * const active = torrents.filter(t => t.status === 'downloading');
   * ```
   */
  getTorrentsList(options?: GetListOptions): Promise<UnifiedTorrent[]>;

  /**
   * Retrieves detailed information about a specific torrent, including file list.
   *
   * @param torrentId - The unique identifier of the torrent
   * @param options - Optional caching parameters
   * @returns A promise resolving to the torrent's detailed information
   * @throws {DebridError} If the torrent is not found or request fails
   *
   * @example
   * ```typescript
   * const details = await provider.getTorrentDetails('12345');
   *
   * // Access individual files
   * for (const file of details.files || []) {
   *   console.log(`${file.name}: ${file.size} bytes`);
   * }
   * ```
   */
  getTorrentDetails(
    torrentId: string,
    options?: GetListOptions
  ): Promise<UnifiedTorrent>;

  /**
   * Retrieves a direct download link for a specific file within a torrent.
   *
   * @param torrentId - The unique identifier of the torrent
   * @param fileId - The unique identifier of the file within the torrent
   * @returns A promise resolving to a direct download URL
   * @throws {DebridError} If the torrent/file is not found or not ready for download
   *
   * @example
   * ```typescript
   * const url = await provider.getLink('12345', '67890');
   *
   * // Use the URL to download
   * const response = await fetch(url);
   * const blob = await response.blob();
   * ```
   */
  getLink(torrentId: string, fileId: string): Promise<string>;

  /**
   * Checks if specific torrents are instantly available (cached) on the servers.
   *
   * @remarks
   * - **Supported by:** TorBox, Premiumize (True/False).
   * - **Partially Supported:** Real-Debrid, AllDebrid (May return all `false` if not implemented).
   * - This method automatically handles "chunking" if you send more hashes than the API allows in one request.
   *
   * @param hashes - An array of SHA1 torrent hashes (e.g., from magnet links).
   * @returns A promise resolving to an object where keys are hashes and values are booleans.
   *
   * @example
   * ```typescript
   * const hashes = ['2f8021...', '8b36e0...'];
   * const availability = await provider.checkCache(hashes);
   *
   * if (availability['2f8021...']) {
   * console.log('Movie A is ready to watch instantly!');
   * } else {
   * console.log('Movie A needs to be downloaded.');
   * }
   * ```
   */
  checkCache(hashes: string[]): Promise<Record<string, boolean>>;

  /**
   * Removes a torrent from the user's account.
   *
   * @param torrentId - The unique identifier of the torrent to remove
   * @returns A promise that resolves when the torrent is successfully deleted
   * @throws {DebridError} If the torrent is not found or deletion fails
   *
   * @example
   * ```typescript
   * await provider.removeTorrent('12345');
   * console.log('Torrent removed successfully');
   * ```
   */
  removeTorrent(torrentId: string): Promise<void>;

  /**
   * Retrieves the current user's account information.
   *
   * @returns A promise resolving to the user's account details
   * @throws {DebridError} If authentication fails or request fails
   *
   * @example
   * ```typescript
   * const user = await provider.getUserInfo();
   *
   * if (!user.isPremium) {
   *   console.log('Premium subscription required');
   * } else {
   *   console.log(`Premium until: ${user.premiumExpiry}`);
   * }
   * ```
   */
  getUserInfo(): Promise<User>;
}
// ============================================================================
// Provider Interfaces
// ============================================================================

/**
 * Usenet capability interface - Only implemented by providers with Usenet support.
 *
 * @remarks Currently supported by: TorBox, Premiumize
 */
export interface UsenetProvider {
  /**
   * Adds a Usenet download via NZB file URL or content.
   *
   * @remarks
   * The returned `AddUsenetResult` contains minimal information.
   * - `name`, `bytes`, and `files` are **only available if cached**.
   * - For non-cached downloads, use `getUsenetDetails()` to get full info once processing completes.
   *
   * @param link - URL to NZB file or raw NZB content
   * @param options - Optional configuration for the download
   * @returns A promise resolving to the add result with cache status
   * @throws {DebridError} If the request fails
   *
   * @example
   * ```typescript
   * const result = await provider.addUsenet('https://example.com/file.nzb', {
   *   name: 'My Download',
   *   password: 'secret123'
   * });
   *
   * if (result.cached) {
   *   console.log(`Ready to download: ${result.name}`);
   * } else {
   *   const details = await provider.getUsenetDetails(result.id);
   * }
   * ```
   */
  addUsenet(link: string, options?: AddUsenetOptions): Promise<AddUsenetResult>;

  /**
   * Retrieves a list of all Usenet downloads in the user's account.
   *
   * @param options - Optional pagination and caching parameters
   * @returns A promise resolving to an array of download details
   * @throws {DebridError} If the request fails
   */
  getUsenetList(options?: GetListOptions): Promise<UnifiedUsenet[]>;

  /**
   * Retrieves detailed information about a specific Usenet download.
   *
   * @param downloadId - The unique identifier of the download
   * @param options - Optional caching parameters
   * @returns A promise resolving to the download's detailed information
   * @throws {DebridError} If the download is not found
   */
  getUsenetDetails(
    downloadId: string,
    options?: GetListOptions
  ): Promise<UnifiedUsenet>;

  /**
   * Retrieves a direct download link for a specific file within a Usenet download.
   *
   * @param downloadId - The unique identifier of the download
   * @param fileId - The unique identifier of the file within the download
   * @returns A promise resolving to a direct download URL
   * @throws {DebridError} If the download/file is not found or not ready
   */
  getUsenetLink(downloadId: string, fileId: string): Promise<string>;

  /**
   * Removes a Usenet download from the user's account.
   *
   * @param downloadId - The unique identifier of the download to remove
   * @returns A promise that resolves when the download is successfully deleted
   * @throws {DebridError} If the download is not found or deletion fails
   */
  removeUsenet(downloadId: string): Promise<void>;

  /**
   * Checks if specific Usenet downloads are instantly available (cached).
   *
   * @remarks
   * - **Supported by:** TorBox, Premiumize
   * - This method automatically handles chunking if you send more hashes than the API allows.
   *
   * @param hashes - An array of NZB hashes to check.
   * @returns A promise resolving to an object where keys are hashes and values are booleans.
   *
   * @example
   * ```typescript
   * const hashes = ['abc123...', 'def456...'];
   * const availability = await provider.checkUsenetCache(hashes);
   *
   * if (availability['abc123...']) {
   *   console.log('Download is cached!');
   * }
   * ```
   */
  checkUsenetCache(hashes: string[]): Promise<Record<string, boolean>>;
}

/**
 * Web download (hoster/direct link) capability interface.
 *
 * @remarks
 * Providers that can "unrestrict" links from hosters like Mega, Rapidgator, etc.
 * Currently supported by: TorBox, Real-Debrid, AllDebrid
 */
export interface WebDownloaderProvider {
  /**
   * Adds a web download (hoster/direct link) to the service.
   *
   * @remarks
   * The returned `AddWebDownloadResult` contains minimal information.
   * - `name`, `bytes`, and `files` are **only available if cached**.
   * - For non-cached downloads, use `getWebDownloadDetails()` to get full info.
   *
   * @param url - The URL to download (hoster link, direct link, etc.)
   * @param options - Optional configuration for the download
   * @returns A promise resolving to the add result with cache status
   * @throws {DebridError} If the URL is unsupported or request fails
   *
   * @example
   * ```typescript
   * const result = await provider.addWebDownload('https://mega.nz/...');
   *
   * if (result.cached) {
   *   console.log(`Ready: ${result.name}`);
   * } else {
   *   const details = await provider.getWebDownloadDetails(result.id);
   * }
   * ```
   */
  addWebDownload(
    url: string,
    options?: AddWebDownloadOptions
  ): Promise<AddWebDownloadResult>;

  /**
   * Retrieves a list of all web downloads in the user's account.
   *
   * @param options - Optional pagination and caching parameters
   * @returns A promise resolving to an array of web download details
   * @throws {DebridError} If the request fails
   */
  getWebDownloadsList(options?: GetListOptions): Promise<UnifiedWebDownload[]>;

  /**
   * Retrieves detailed information about a specific web download.
   *
   * @param downloadId - The unique identifier of the download
   * @param options - Optional caching parameters
   * @returns A promise resolving to the download's detailed information
   * @throws {DebridError} If the download is not found
   */
  getWebDownloadDetails(
    downloadId: string,
    options?: GetListOptions
  ): Promise<UnifiedWebDownload>;

  /**
   * Retrieves a direct download link for a specific file within a web download.
   *
   * @param downloadId - The unique identifier of the download
   * @param fileId - The unique identifier of the file within the download
   * @returns A promise resolving to a direct download URL
   * @throws {DebridError} If the download/file is not found or not ready
   */
  getWebDownloadLink(downloadId: string, fileId: string): Promise<string>;

  /**
   * Removes a web download from the user's account.
   *
   * @param downloadId - The unique identifier of the download to remove
   * @returns A promise that resolves when the download is successfully deleted
   * @throws {DebridError} If the download is not found or deletion fails
   */
  removeWebDownload(downloadId: string): Promise<void>;

  /**
   * Checks if specific web downloads are instantly available (cached).
   *
   * @param hashes - An array of hashes to check.
   * @returns A promise resolving to an object where keys are hashes and values are booleans.
   */
  checkWebDownloadCache(hashes: string[]): Promise<Record<string, boolean>>;

  /**
   * Gets a list of supported hosters for this provider.
   *
   * @returns A promise resolving to an array of supported hoster domains
   *
   * @example
   * ```typescript
   * const hosters = await provider.getHostersList();
   * // ['mega.nz', 'rapidgator.net', '1fichier.com', ...]
   * ```
   */
  getHostersList(): Promise<HosterInfo[]>;
}
