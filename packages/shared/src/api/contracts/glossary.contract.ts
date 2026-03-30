/**
 * API contracts for the Glossary bounded context
 * Handles glossary creation, management, and sharing
 */

import { GlossaryType, GlossaryPermission } from './types';

/**
 * Request to create a new glossary
 */
export interface CreateGlossary_Request {
  /** Name of the glossary */
  name: string;
  /** Type of glossary */
  type: GlossaryType;
  /** Optional description of the glossary */
  description?: string;
}

/**
 * Request to retrieve a glossary
 */
export interface GetGlossary_Request {
  /** Unique identifier of the glossary */
  glossaryId: string;
}

/**
 * Request to add an entry to a glossary
 */
export interface AddGlossaryEntry_Request {
  /** Glossary ID to add the entry to */
  glossaryId: string;
  /** Term ID to add */
  termId: string;
  /** Optional custom notes for this glossary entry */
  customNotes?: string;
}

/**
 * Request to remove an entry from a glossary
 */
export interface RemoveGlossaryEntry_Request {
  /** Glossary ID to remove the entry from */
  glossaryId: string;
  /** Term ID to remove */
  termId: string;
}

/**
 * Request to share a glossary with other users
 */
export interface ShareGlossary_Request {
  /** Glossary ID to share */
  glossaryId: string;
  /** Array of user IDs to share with */
  targetUserIds: string[];
  /** Permission level to grant */
  permission: GlossaryPermission;
}

/**
 * Response containing glossary information
 */
export interface Glossary_Response {
  /** Unique identifier of the glossary */
  id: string;
  /** Name of the glossary */
  name: string;
  /** Type of glossary */
  type: GlossaryType;
  /** Optional description */
  description?: string;
  /** ID of the user who owns the glossary */
  ownerId: string;
  /** Number of entries in the glossary */
  entryCount: number;
  /** ISO timestamp when the glossary was created */
  createdAt: string;
  /** ISO timestamp when the glossary was last updated */
  updatedAt: string;
}

/**
 * Response containing a glossary entry
 */
export interface GlossaryEntry_Response {
  /** ID of the term in this entry */
  termId: string;
  /** The term text */
  term: string;
  /** The term definition */
  definition: string;
  /** Optional custom notes added by the glossary owner */
  customNotes?: string;
  /** ID of the user who added this entry */
  addedBy: string;
  /** ISO timestamp when the entry was added */
  addedAt: string;
}

/**
 * Response containing a list of glossaries
 */
export interface GlossaryList_Response {
  /** Array of glossary objects */
  glossaries: Glossary_Response[];
}
