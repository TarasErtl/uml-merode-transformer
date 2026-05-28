/**
 * Base proposal interface.
 */
export interface Proposal {
  id: string;
  message: string;
}

/**
 * Proposal for a unary association.
 */
export interface UnaryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRole1Name: string;  
    proposedRole2Name: string;
}

/**
 * Proposal for a binary association.
 */
export interface BinaryAssociationProposal extends Proposal {
    proposedExistenceDependency: boolean;
    // If existence dependent fill the values, else store the names and IDs of the non existence dependent classes.
    proposedMasterClassId: string;
    proposedDependentClassId: string;
    proposedMasterClassName: string;
    proposedDependentClassName: string;
    // Only needed if not existence dependent.
    proposedClassName?: string;
    proposedRole1Name?: string;
    proposedRole2Name?: string;
    
}

/**
 * Proposal for an n-ary association.
 */
export interface NAryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRoleNames: string[];
}