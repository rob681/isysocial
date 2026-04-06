export { appRouter } from "./root";
export type { AppRouter } from "./root";
export { createContext } from "./context";
export type { Context } from "./context";
export { publishToNetwork, buildCaption } from "./lib/publishers/index";
export type { PublishResult, PublishContext } from "./lib/publishers/index";

// Shared DB utilities for cross-product features
export {
  getOrganizationByAgencyId,
  getOrCreateOrganization,
  getOrganizationSubscriptions,
  hasActiveSubscription,
  hasActiveSubscriptionByAgency,
  hasBothProducts,
  upsertSubscription,
  getSubscription,
  queueEvent,
  fetchPendingEvents,
  markEventDone,
  markEventFailed,
  getEventBusHealth,
  createSSOSession,
  consumeSSOSession,
  cleanupExpiredSSOSessions,
} from "./lib/shared-db";
export type {
  Organization,
  SharedSubscription,
  CrossAppEvent,
  SSOSession,
  Product as SharedProduct,
  PlanTier as SharedPlanTier,
  SubscriptionStatus as SharedSubscriptionStatus,
  EventStatus,
} from "./lib/shared-db";
