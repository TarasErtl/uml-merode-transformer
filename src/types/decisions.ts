export interface Decision {
  id: string; // Corresponds to the proposal ID
  type: string; // To differentiate between different decision types
}

export interface UnaryAssociationDecision extends Decision {
  chosenClassName: string;
  chosenRole1Name: string;
  chosenRole2Name: string;
}

export interface BinaryAssociationDecision extends Decision {
  chosenExistenceDependency: boolean;
  chosenMasterClassId: string;
  chosenDependentClassId: string;
}