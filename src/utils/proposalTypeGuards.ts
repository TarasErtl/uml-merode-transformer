import { 
  type Proposal, 
  type UnaryAssociationProposal, 
  type BinaryAssociationProposal,
  type BinaryAssociationExistenceDependentProposal,
  type BinaryAssociationNoExistenceDependencyProposal,
} from '../types/proposals';

// General type guards
export const isBinaryAssociationProposal = (p: Proposal): p is BinaryAssociationProposal => 'proposedExistenceDependency' in p;
export const isUnaryAssociationProposal = (p: Proposal): p is UnaryAssociationProposal => 'proposedClassName' in p && !isBinaryAssociationProposal(p);

// More specific type guards for binary associations
export const isBinaryAssociationExistenceDependentProposal = (p: Proposal): p is BinaryAssociationExistenceDependentProposal =>
  isBinaryAssociationProposal(p) && p.proposedExistenceDependency === true;

export const isBinaryAssociationNoExistenceDependencyProposal = (p: Proposal): p is BinaryAssociationNoExistenceDependencyProposal =>
  isBinaryAssociationProposal(p) && p.proposedExistenceDependency === false;