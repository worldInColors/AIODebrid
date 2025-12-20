// ============================================================================
// AIODebrid - Unified Debrid Service Provider Library
// ============================================================================

// Export all types
export type {
  // Common types
  UnifiedFile,
  DownloadStatus,
  TorrentStatus,

  // Add result types (returned immediately after adding)
  AddTorrentResult,
  AddUsenetResult,
  AddWebDownloadResult,

  // Full detail types (returned when fetching/listing)
  UnifiedTorrent,
  UnifiedUsenet,
  UnifiedWebDownload,

  // User/account types
  User,

  // Options types
  AddMagnetOptions,
  AddUsenetOptions,
  AddWebDownloadOptions,
  GetListOptions,

  // Provider interfaces
  DebridProvider,
  UsenetProvider,
  WebDownloaderProvider,
} from "./interface";

// Export providers
export { TorBox } from "./providers/torbox";

// Export error types
export {
  DebridError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  InsufficientQuotaError,
} from "./errors";
