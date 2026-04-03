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
    //if existence dependent fill the values, if not use to store the names and id's of the adjacent classes
    proposedMasterClassId: string;
    proposedDependentClassId: string;
    proposedMasterClassName: string;
    proposedDependentClassName: string;
    //only needed if not existence dependent
    proposedClassName?: string;
    proposedRole1Name?: string;
    proposedRole2Name?: string;
    
}

export interface NAryAssociationProposal extends Proposal {
    proposedClassName: string;
    proposedRoleNames: string[];
}