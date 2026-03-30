/**
 * Shared type definitions for API contracts
 * These are string literal unions for better serialization
 */

export const TermCategory = {
  ACRONYM: 'ACRONYM',
  JARGON: 'JARGON',
  TECHNOLOGY: 'TECHNOLOGY',
  INDUSTRY_TERM: 'INDUSTRY_TERM',
  PRODUCT_NAME: 'PRODUCT_NAME',
} as const;
export type TermCategory = (typeof TermCategory)[keyof typeof TermCategory];

export const TermSource = {
  AI_GENERATED: 'AI_GENERATED',
  USER_SUBMITTED: 'USER_SUBMITTED',
  SYSTEM_CURATED: 'SYSTEM_CURATED',
  USER_PROVIDED: 'USER_PROVIDED',
  LLM_ENRICHED: 'LLM_ENRICHED',
} as const;
export type TermSource = (typeof TermSource)[keyof typeof TermSource];

/**
 * Supported document types for detection
 */
export type DocumentType = 'GOOGLE_DOCS' | 'GMAIL' | 'NOTION' | 'WEB_PAGE' | 'CUSTOM';

/**
 * Glossary types
 */
export type GlossaryType = 'PERSONAL' | 'TEAM' | 'COMPANY';

/**
 * Permission levels for glossary access
 */
export type GlossaryPermission = 'READ' | 'WRITE';

/**
 * User roles in the system
 */
export type UserRole = 'INDIVIDUAL' | 'TEAM_ADMIN' | 'COMPANY_ADMIN';

/**
 * User account status
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Roles within a team
 */
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Source of user signup
 */
export type SignupSource = 'CHROME_STORE' | 'DIRECT_WEBSITE' | 'REFERRAL';

/**
 * Styles for highlighting glossary terms
 */
export type HighlightStyle = 'UNDERLINE' | 'HIGHLIGHT' | 'TOOLTIP_ONLY';

/**
 * Available subscription plans
 */
export type PlanType = 'FREEMIUM' | 'PRO' | 'ENTERPRISE';

/**
 * Billing period options
 */
export type BillingPeriod = 'MONTHLY' | 'ANNUAL';

/**
 * Current status of a subscription
 */
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'OVERDUE';

/**
 * Invoice payment status
 */
export type InvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
