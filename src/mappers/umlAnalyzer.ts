import { 
  type UMLAssociation, 
  type UMLRegularAssociationEnd,
  UMLLowerBound, 
  UMLUpperBound
} from '../types/metamodels/uml';


/**
 * interface for the returns of the most methods in this file
 */
export type AnalyzerReturn = 
  { response: false }
  | { response: true; masterClassId: string; dependentClassId: string };

/**
 * assumes whether a existence dependency exists between two classes based on the multiplicity of the association ends.
 * if one side has the multiplicity 1..1 it is assumend there is an existence dependency and this side is the master
 * @param end1 the first association end of the UML association
 * @param end2 the second association end of the UML association
 * @returns AnalyzerReturn
 */
export const checkExistenceDependency = (umlAssoc: UMLAssociation): AnalyzerReturn => {
    const [end1, end2] = getRegularAssociationEnds(umlAssoc);
    
    if (end1.upperBound === UMLUpperBound.One && end1.lowerBound === UMLLowerBound.One) {
        return { response: true, masterClassId: end1.targetClassId, dependentClassId: end2.targetClassId };
    }
    if (end2.upperBound === UMLUpperBound.One && end2.lowerBound === UMLLowerBound.One) {
        return { response: true, masterClassId: end2.targetClassId, dependentClassId: end1.targetClassId };
    }
    return { response: false };
};

/**
 * Checks if a UML association is a aggregation.
 * if yes then the aggregation side is assumed to be the master in the existence dependency
 * @param UMLAssociation the UML association that should be checked
 * @return AnalyzerReturn
 */
export const checkAggregationAssociation = (umlAssoc: UMLAssociation): AnalyzerReturn => {
    const [end1, end2] = getRegularAssociationEnds(umlAssoc);

    if(end1.endType === 'shared' || end1.endType === 'composite'){
        return { response: true, masterClassId: end1.targetClassId, dependentClassId: end2.targetClassId };
    }
    if(end2.endType === 'shared' || end2.endType === 'composite'){
        return { response: true, masterClassId: end2.targetClassId, dependentClassId: end1.targetClassId };
    }
            
    return { response: false };
}

/**
 * Checks if a UML association is a generalization.
 * if yes then the superClassId is returned in the masterClassId variable.
 * @param umlAssoc The UML association to check.
 * @returns AnalyzerReturn
 */
export const isGeneralizationAssociation = (umlAssoc: UMLAssociation): AnalyzerReturn => {
    const [end1, end2] = umlAssoc.ends;
    if(end1.endType === 'generalization'){
        return { response: true, masterClassId: end1.targetClassId, dependentClassId: end2.targetClassId };
    }
    if(end2.endType === 'generalization'){
        return { response: true, masterClassId: end2.targetClassId, dependentClassId: end1.targetClassId };
    }
    return { response: false };
};

/**
 * Returns the Ends of an UML Association as UMLRegularAssociationEnds
 * it is not checked whether one end is an generalisation, so the user should check that in advance
 * @param umlAssoc the Association which ends should be returned
 * @returns the Array of the UMLRegularAssociationEnd
 */
export const getRegularAssociationEnds = (umlAssoc: UMLAssociation): UMLRegularAssociationEnd[]=> {
  return umlAssoc.ends as UMLRegularAssociationEnd[];
};
