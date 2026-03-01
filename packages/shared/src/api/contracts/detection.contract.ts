/**
 * API contracts for the Detection bounded context
 * Handles term extraction and enrichment from documents
 */

import { TermCategory, DocumentType } from './types';
import { TermDefinition_Response } from './terminology.contract';

/**
 * Request to start a term detection session
 */
export interface StartDetectionSession_Request {
  /** URL or path of the document to analyze */
  documentUrl: string;
  /** Type of document being analyzed */
  documentType: DocumentType;
  /** Optional array of glossary IDs to use for detection context */
  glossaryIds?: string[];
}

/**
 * Request to extract term candidates from content
 */
export interface ExtractCandidates_Request {
  /** The content to extract candidates from */
  content: string;
  /** Optional language of the content (ISO 639-1 code) */
  language?: string;
}

/**
 * Request to enrich a term candidate with a full definition
 */
export interface EnrichTermCandidate_Request {
  /** Session ID from the detection session */
  sessionId: string;
  /** The term candidate text */
  term: string;
  /** Context surrounding the term */
  context: string;
}

/**
 * Client-side term candidate used by the extension for local extraction.
 * This is NOT an API response — it's a shared DTO for the detection pipeline.
 */
export interface TermCandidate {
  /** The candidate term text */
  text: string;
  /** Position of the term in the source content */
  position: {
    /** Starting character position */
    start: number;
    /** Ending character position */
    end: number;
  };
  /** Confidence score (0-100) that this is a valid term */
  confidence: number;
  /** Context surrounding the term */
  context: string;
  /** Category hint from extraction (acronym, compound, pattern, jargon) */
  category: string;
}

/**
 * Response representing a candidate term for definition (API response)
 */
export interface TermCandidate_Response {
  /** Unique identifier of the candidate */
  id: string;
  /** The candidate term text */
  text: string;
  /** Position of the term in the source content */
  position: {
    /** Starting character position */
    start: number;
    /** Ending character position */
    end: number;
  };
  /** Confidence score (0-1) that this is a valid term */
  confidence: number;
  /** Optional category if already classified */
  category?: TermCategory;
  /** Context surrounding the term */
  context: string;
}

/**
 * Response when starting a detection session
 */
export interface StartDetectionSession_Response {
  /** Unique session identifier */
  sessionId: string;
  /** The document URL that was analyzed */
  documentUrl: string;
  /** ISO timestamp when the session was created */
  createdAt: string;
}

/**
 * Response containing extracted term candidates
 */
export interface ExtractCandidates_Response {
  /** Array of extracted term candidates */
  candidates: TermCandidate_Response[];
  /** Total number of candidates found */
  totalCandidates: number;
}

/**
 * Response from enriching a term candidate
 */
export interface EnrichTermCandidate_Response {
  /** ID of the created or matched term definition */
  termId: string;
  /** Full term definition with metadata */
  definition: TermDefinition_Response;
  /** Operation latency in milliseconds */
  latencyMs: number;
}
