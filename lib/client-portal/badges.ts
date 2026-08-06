import type { LucideIcon } from "lucide-react";
import {
  Award,
  Briefcase,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileUp,
  GitBranch,
  MessageSquare,
  Scale,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import { addBadgeEarnedNotification } from "@/lib/client-portal/notifications-store";

export const BADGES_STORAGE_KEY = "counselflow-client-badges";
export const BADGE_EVENTS_KEY = "counselflow-client-badge-events";
export const BADGES_UPDATE_EVENT = "client-badges-updated";

export type ClientBadgeId =
  | "lightning-reply"
  | "clockwork-client"
  | "paperwork-pro"
  | "exhibit-ace"
  | "inbox-advocate"
  | "request-ranger"
  | "status-scout"
  | "matter-maven"
  | "ledger-legend"
  | "plan-pilot"
  | "portal-prospector"
  | "courthouse-courier"
  | "scale-sider";

export type ClientBadgeEvent =
  | "message_sent"
  | "payment_completed"
  | "payment_on_time"
  | "document_uploaded"
  | "all_docs_submitted"
  | "request_submitted"
  | "case_status_viewed"
  | "case_info_viewed"
  | "account_summary_viewed"
  | "payment_plan_setup"
  | "engagement_reviewed";

export interface ClientBadgeDefinition {
  id: ClientBadgeId;
  name: string;
  description: string;
  howToEarn: string;
  icon: LucideIcon;
  /** Events that can unlock this badge */
  unlockEvents: ClientBadgeEvent[];
}

export const CLIENT_BADGE_CATALOG: ClientBadgeDefinition[] = [
  {
    id: "lightning-reply",
    name: "Lightning Reply",
    description: "You jump on requests and messages like a closing argument.",
    howToEarn: "Respond to firm requests or messages within 24 hours.",
    icon: Zap,
    unlockEvents: ["message_sent"],
  },
  {
    id: "clockwork-client",
    name: "Clockwork Client",
    description: "Your payments land before opposing counsel finishes coffee.",
    howToEarn: "Make a payment on time.",
    icon: Timer,
    unlockEvents: ["payment_on_time", "payment_completed"],
  },
  {
    id: "paperwork-pro",
    name: "Paperwork Pro",
    description: "The file room wishes every client filed like you.",
    howToEarn: "Submit all required and requested documentation.",
    icon: FileCheck2,
    unlockEvents: ["all_docs_submitted"],
  },
  {
    id: "exhibit-ace",
    name: "Exhibit Ace",
    description: "You upload evidence before anyone asks twice.",
    howToEarn: "Upload a case document.",
    icon: FileUp,
    unlockEvents: ["document_uploaded"],
  },
  {
    id: "inbox-advocate",
    name: "Inbox Advocate",
    description: "Your messages keep the case moving.",
    howToEarn: "Send a message to your legal team.",
    icon: MessageSquare,
    unlockEvents: ["message_sent"],
  },
  {
    id: "request-ranger",
    name: "Request Ranger",
    description: "You know how to ask the firm for exactly what you need.",
    howToEarn: "Submit a request to the firm.",
    icon: ClipboardList,
    unlockEvents: ["request_submitted"],
  },
  {
    id: "status-scout",
    name: "Status Scout",
    description: "You keep tabs on milestones like a docket clerk.",
    howToEarn: "Check your Case Status.",
    icon: GitBranch,
    unlockEvents: ["case_status_viewed"],
  },
  {
    id: "matter-maven",
    name: "Matter Maven",
    description: "You know your matter details inside and out.",
    howToEarn: "Review Case Information.",
    icon: Briefcase,
    unlockEvents: ["case_info_viewed"],
  },
  {
    id: "ledger-legend",
    name: "Ledger Legend",
    description: "You cleared a balance and made Billing smile.",
    howToEarn: "Complete a payment in Pay Balance.",
    icon: CreditCard,
    unlockEvents: ["payment_completed"],
  },
  {
    id: "plan-pilot",
    name: "Plan Pilot",
    description: "You charted a payment plan and stuck the landing.",
    howToEarn: "Set up a recurring payment plan.",
    icon: CalendarClock,
    unlockEvents: ["payment_plan_setup"],
  },
  {
    id: "portal-prospector",
    name: "Portal Prospector",
    description: "You dug into Account Summary and struck clarity.",
    howToEarn: "Open Account Summary.",
    icon: Wallet,
    unlockEvents: ["account_summary_viewed"],
  },
  {
    id: "courthouse-courier",
    name: "Courthouse Courier",
    description: "Multiple filings delivered without a paper jam.",
    howToEarn: "Upload documents more than once.",
    icon: Award,
    unlockEvents: ["document_uploaded"],
  },
  {
    id: "scale-sider",
    name: "Scale Sider",
    description: "You reviewed your engagement and stayed informed.",
    howToEarn: "Review your engagement details in Case Information.",
    icon: Scale,
    unlockEvents: ["engagement_reviewed", "case_info_viewed"],
  },
];

export interface EarnedBadgeRecord {
  badgeId: ClientBadgeId;
  earnedAt: string;
}

interface BadgeEventRecord {
  event: ClientBadgeEvent;
  at: string;
  count?: number;
}

function readEarned(): EarnedBadgeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(BADGES_STORAGE_KEY) ?? "[]");
    return Array.isArray(stored) ? (stored as EarnedBadgeRecord[]) : [];
  } catch {
    return [];
  }
}

function writeEarned(records: EarnedBadgeRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(BADGES_UPDATE_EVENT));
}

function readEvents(): BadgeEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(BADGE_EVENTS_KEY) ?? "[]");
    return Array.isArray(stored) ? (stored as BadgeEventRecord[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: BadgeEventRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BADGE_EVENTS_KEY, JSON.stringify(events.slice(0, 200)));
}

export function getEarnedBadgeIds(): Set<ClientBadgeId> {
  return new Set(readEarned().map((item) => item.badgeId));
}

export function getEarnedBadges(): EarnedBadgeRecord[] {
  return readEarned();
}

export function isBadgeEarned(badgeId: ClientBadgeId): boolean {
  return getEarnedBadgeIds().has(badgeId);
}

function countEvent(event: ClientBadgeEvent): number {
  return readEvents().filter((item) => item.event === event).length;
}

function hasEvent(event: ClientBadgeEvent): boolean {
  return countEvent(event) > 0;
}

function shouldAward(badgeId: ClientBadgeId): boolean {
  switch (badgeId) {
    case "lightning-reply":
      return hasEvent("message_sent");
    case "clockwork-client":
      return hasEvent("payment_on_time") || hasEvent("payment_completed");
    case "paperwork-pro":
      return hasEvent("all_docs_submitted");
    case "exhibit-ace":
      return hasEvent("document_uploaded");
    case "inbox-advocate":
      return hasEvent("message_sent");
    case "request-ranger":
      return hasEvent("request_submitted");
    case "status-scout":
      return hasEvent("case_status_viewed");
    case "matter-maven":
      return hasEvent("case_info_viewed");
    case "ledger-legend":
      return hasEvent("payment_completed");
    case "plan-pilot":
      return hasEvent("payment_plan_setup");
    case "portal-prospector":
      return hasEvent("account_summary_viewed");
    case "courthouse-courier":
      return countEvent("document_uploaded") >= 2;
    case "scale-sider":
      return (
        hasEvent("engagement_reviewed") || hasEvent("case_info_viewed")
      );
    default:
      return false;
  }
}

function awardBadge(badgeId: ClientBadgeId): boolean {
  const earned = readEarned();
  if (earned.some((item) => item.badgeId === badgeId)) return false;

  writeEarned([
    { badgeId, earnedAt: new Date().toISOString() },
    ...earned,
  ]);
  addBadgeEarnedNotification(badgeId);
  return true;
}

/**
 * Record a client behavior and award any newly unlocked badges.
 * Returns the IDs of badges earned from this event.
 */
export function recordClientBadgeEvent(
  event: ClientBadgeEvent,
): ClientBadgeId[] {
  if (typeof window === "undefined") return [];

  const events = readEvents();
  events.unshift({ event, at: new Date().toISOString() });
  writeEvents(events);

  return evaluateClientBadges();
}

/** Re-evaluate all badges from stored events (safe to call on page load). */
export function evaluateClientBadges(): ClientBadgeId[] {
  if (typeof window === "undefined") return [];

  const newlyEarned: ClientBadgeId[] = [];
  for (const badge of CLIENT_BADGE_CATALOG) {
    if (isBadgeEarned(badge.id)) continue;
    if (shouldAward(badge.id) && awardBadge(badge.id)) {
      newlyEarned.push(badge.id);
    }
  }
  return newlyEarned;
}
