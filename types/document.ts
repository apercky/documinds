/**
 * Metadata for documents stored in the vector store
 */
export interface DocumentMetadata {
  /** Name of the document file */
  name?: string;
  /** MIME type of the document */
  type?: string;
  /** Size of the document in bytes */
  size?: number;
  /** Timestamp when the document was uploaded */
  uploadedAt?: Date;
  /** Any additional custom metadata properties */
  [key: string]: unknown;
}
