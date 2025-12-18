/**
 * Represents a file within a torrent.
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
 * Represents a torrent with normalized properties across providers.
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
  status: "downloading" | "seeding" | "paused" | "completed" | "error";
  /** Current download/upload speed in bytes per second */
  speed: number;
  /** Number of seeds (optional) */
  seeds?: number;
  /** Number of peers (optional) */
  peers?: number;
  /** Estimated time remaining in seconds (optional) */
  eta?: number;
  /** List of files in the torrent (optional) */
  files?: UnifiedFile[];
}

/**
 * Represents user account information.
 */
export interface User {
  /** Username or email address */
  username: string;
  /** Whether the user has an active premium subscription */
  isPremium: boolean;
  /** When the premium subscription expires (optional) */
  premiumExpiry?: Date;
}

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
 * Options for retrieving the list of torrents.
 */
export interface GetTorrentsListOptions {
  /** If true, bypasses the cache and fetches fresh data */
  bypassCache?: boolean;
  /** Number of items to skip  */
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
   * @param magnetLink - The magnet URI to add (must start with "magnet:?")
   * @param options - Optional configuration for the torrent
   * @returns A promise resolving to the created torrent's details
   * @throws {DebridError} If the magnet link is invalid or the request fails
   *
   * @example
   * ```typescript
   * const torrent = await provider.addMagnet('magnet:?xt=urn:btih:...', {
   *   name: 'My Movie',
   *   addOnlyIfCached: true
   * });
   *
   * if (torrent.status === 'completed') {
   *   console.log('Already cached!');
   * }
   * ```
   */
  addMagnet(
    magnetLink: string,
    options?: AddMagnetOptions
  ): Promise<UnifiedTorrent>;

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
  getTorrentsList(options?: GetTorrentsListOptions): Promise<UnifiedTorrent[]>;

  /**
   * Retrieves detailed information about a specific torrent, including file list.
   *
   * @param torrentId - The unique identifier of the torrent
   * @param options - Optional pagination and caching parameters
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
    options?: GetTorrentsListOptions
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
