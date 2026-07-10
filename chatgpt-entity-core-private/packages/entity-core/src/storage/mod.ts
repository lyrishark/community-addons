/**
 * Storage Module
 *
 * Handles persistence of my identity and memories.
 */

export { createFileStore, FileStore } from "./file-store.ts";
export {
  applyMemoryMetadata,
  type MemoryLineageMetadata,
  memoryReference,
  parseMemoryMetadata,
  stripMemoryMetadata,
} from "./memory-metadata.ts";
