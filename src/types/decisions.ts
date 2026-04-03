export interface Decision {
  id: string;
  type: string;
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
  chosenClassName?: string;
  chosenRole1Name?: string;
  chosenRole2Name?: string;
}

export interface NAryAssociationDecision extends Decision {
  chosenClassName: string;
  chosenRoleNames: string[];
}