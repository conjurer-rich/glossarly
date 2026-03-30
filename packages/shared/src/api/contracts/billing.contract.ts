/**
 * API contracts for the Billing bounded context
 * Handles subscriptions, usage tracking, and invoices
 */

import {
  PlanType,
  BillingPeriod,
  SubscriptionStatus,
  InvoiceStatus,
} from './types';

/**
 * Request to create a new subscription
 */
export interface CreateSubscription_Request {
  /** Type of plan to subscribe to */
  planType: PlanType;
  /** Billing period for the subscription */
  billingPeriod: BillingPeriod;
  /** Optional team ID for team subscriptions */
  teamId?: string;
}

/**
 * Request to cancel a subscription
 */
export interface CancelSubscription_Request {
  /** ID of the subscription to cancel */
  subscriptionId: string;
  /** Optional reason for cancellation */
  reason?: string;
}

/**
 * Request to retrieve usage metrics
 */
export interface GetUsageMetrics_Request {
  /** ID of the subscription */
  subscriptionId: string;
  /** Period for which to retrieve metrics */
  period: BillingPeriod;
}

/**
 * Response containing usage metrics
 */
export interface UsageMetrics_Response {
  /** Number of lookups used in this period */
  lookupsUsed: number;
  /** Maximum lookups allowed in this period */
  lookupsLimit: number;
  /** ISO timestamp of period start */
  periodStart: string;
  /** ISO timestamp of period end */
  periodEnd: string;
}

/**
 * Response containing subscription information
 */
export interface Subscription_Response {
  /** Unique identifier of the subscription */
  id: string;
  /** ID of the user who owns the subscription */
  userId: string;
  /** Optional ID of the team (if team subscription) */
  teamId?: string;
  /** Plan type of the subscription */
  plan: PlanType;
  /** Billing period of the subscription */
  billingPeriod: BillingPeriod;
  /** Current status of the subscription */
  status: SubscriptionStatus;
  /** ISO timestamp when the subscription started */
  startDate: string;
  /** ISO timestamp when the subscription will renew */
  renewalDate: string;
  /** Current usage metrics */
  currentUsage: UsageMetrics_Response;
}

/**
 * Response containing invoice information
 */
export interface Invoice_Response {
  /** Unique identifier of the invoice */
  id: string;
  /** ID of the associated subscription */
  subscriptionId: string;
  /** Invoice amount in cents */
  amount: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Current status of the invoice */
  status: InvoiceStatus;
  /** ISO timestamp when the invoice was issued */
  issuedAt: string;
  /** ISO timestamp when the invoice was paid (if applicable) */
  paidAt?: string;
}
