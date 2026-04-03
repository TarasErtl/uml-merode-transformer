export interface Proposal {
  id: string;
  message: string;
}

export interface UnaryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRole1Name: string;  
    proposedRole2Name: string;
}

export interface BinaryAssociationProposal extends Proposal {
    proposedExistenceDependency: boolean;
}

export interface BinaryAssociationExistenceDependentProposal extends BinaryAssociationProposal {
    proposedMasterClassId: string;
    proposedDependentClassId: string;
    proposedMasterClassName?: string;
    proposedDependentClassName?: string;
}

export interface BinaryAssociationNoExistenceDependencyProposal extends BinaryAssociationProposal {
    proposedClassName: string;
    proposedRole1Name?: string;
    proposedRole2Name?: string;
    class1Name?: string;
    class2Name?: string;
}

export interface NAryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRoleNames: string[];
}