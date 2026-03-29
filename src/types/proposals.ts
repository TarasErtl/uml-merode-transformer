export interface Proposal {
  id: string;
}

export interface UnaryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRole1Name: string;  
    proposedRole2Name: string;
}

export interface BinaryAssociationProposal extends Proposal {
    proposedExistenceDependency: boolean;
    proposedMasterClassId: string;
    proposedDependentClassId: string;
}