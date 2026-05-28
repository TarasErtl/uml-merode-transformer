import { 
  type Proposal, 
  type UnaryAssociationProposal, 
  type BinaryAssociationProposal,
  type NAryAssociationProposal,
  type EventsProposal,
} from '../types/proposals';

// General type guards
export const isBinaryAssociationProposal = (p: Proposal): p is BinaryAssociationProposal => 'proposedExistenceDependency' in p;
export const isUnaryAssociationProposal = (p: Proposal): p is UnaryAssociationProposal => 'proposedRole1Name' in p && 'proposedClassName' in p && !isBinaryAssociationProposal(p);
export const isNAryAssociationProposal = (p: Proposal): p is NAryAssociationProposal => 'proposedRoleNames' in p && Array.isArray((p as NAryAssociationProposal).proposedRoleNames);
export const isEventsProposal = (p: Proposal): p is EventsProposal => 'type' in p && (p as EventsProposal).type === 'eventsProposal';