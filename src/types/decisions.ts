export interface Decision {
    id: string;
}

export interface UnaryAssociationDecision extends Decision {
    chosenClassName: string;
    chosenRole1Name: string;
    chosenRole2Name: string;
}

export interface BinaryAssociationDecision extends Decision {
    existenceDependency: boolean;
    masterClassId: string;
    dependentClassId: string;
}