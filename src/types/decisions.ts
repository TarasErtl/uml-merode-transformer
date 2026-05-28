import { type BusinessEventItem } from "./proposals";

/**
 * Base decision interface.
 */
export interface Decision {
  id: string;
  type: string;
}

/**
 * Decision for a unary association.
 */
export interface UnaryAssociationDecision extends Decision {
  chosenClassName: string;
  chosenRole1Name: string;
  chosenRole2Name: string;
}

/**
 * Decision for a binary association.
 */
export interface BinaryAssociationDecision extends Decision {
  chosenExistenceDependency: boolean;
  chosenMasterClassId: string;
  chosenDependentClassId: string;
  chosenClassName?: string;
  chosenRole1Name?: string;
  chosenRole2Name?: string;
}

/**
 * Decision for an n-ary association.
 */
export interface NAryAssociationDecision extends Decision {
  chosenClassName: string;
  chosenRoleNames: string[];
}

/**
 * Decision for filtering business events.
 */
export interface EventsDecision extends Decision {
  events: BusinessEventItem[];
}