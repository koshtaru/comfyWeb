// ============================================================================
// ComfyUI React - Compression Types
// ============================================================================

export interface ChunkMetadata {
  id: string
  presetId: string
  chunkIndex: number
  totalChunks: number
  data: string
  checksum: string
  compressed: boolean
}

export interface CompressionResult {
  data: string | ChunkMetadata[]
  compressed: boolean
  compressionLevel: CompressionLevel
  originalSize: number
  compressedSize: number
  ratio: number
  isChunked: boolean
  chunkCount?: number
}

export enum CompressionLevel {
  NONE = 0,        // < 1KB - No compression, just base64
  BASIC = 1,       // 1KB-50KB - LZ-string standard compression
  ENHANCED = 2,    // 50KB-100KB - LZ-string UTF16 compression
  CHUNKED = 3      // > 100KB - Chunked compression
}