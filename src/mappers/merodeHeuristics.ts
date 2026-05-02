import { 
  type UMLAssociation, 
  type UMLRegularAssociationEnd,
  UMLLowerBound, 
  UMLUpperBound
} from '../types/metamodels/uml';

/**
 * assumes whether a existence dependency exists between two classes based on the multiplicity of the association ends.
 * if one side has the multiplicity 1..1, then existence dependency is assumed, with the class on the 1..1 side being the master
 * @param end1 the first association end of the UML association
 * @param end2 the second association end of the UML association
 * @return a tuple first element (boolean) indicating whether existence dependency should be assumed, 
 *         the second element is the id of the assumed master class
 *         the third element is the id of the assumed dependent class
 */
export const checkExistenceDependency = (end1: UMLRegularAssociationEnd, end2: UMLRegularAssociationEnd): [boolean, string, string] => {
  if (end1.upperBound === UMLUpperBound.One && end1.lowerBound === UMLLowerBound.One) {
    return [true, end1.targetClassId, end2.targetClassId];
  }
  if (end2.upperBound === UMLUpperBound.One && end2.lowerBound === UMLLowerBound.One) {
    return [true, end2.targetClassId, end1.targetClassId];
  }
  return [false, '', ''];
};

/**
 * used to check whether one side of the association has an aggregation.
 * @param UMLAssociation the UML association that should be checked
 * @return tuple with first element (boolean) indicating whether the association is an aggregation,
 *        the second element is the id of the class on the aggregation side,
 *        the third element is the id of the class on the non-aggregation side
 */
export const checkAggregationAssociation = (umlAssoc: UMLAssociation): [boolean, string, string] => {
  const ends = getRegularAssociationEnds(umlAssoc);
  if (!ends) {
    return [false, '', ''];
  }

  const [end1, end2] = ends;

  if(end1.endType === 'shared' || end1.endType === 'composite'){
    return [true, end1.targetClassId, end2.targetClassId];
  }
  if(end2.endType === 'shared' || end2.endType === 'composite'){
    return [true, end2.targetClassId, end1.targetClassId];
  }
         
  return [false, '', ''];
}

/**
 * Checks if a UML association represents a generalization.
 * @param umlAssoc The UML association to check.
 * @returns `true` if the association is a generalization, `false` otherwise.
 */
export const isGeneralizationAssociation = (umlAssoc: UMLAssociation): boolean => {
  return umlAssoc.ends.some(end => end.endType === 'generalization');
};

/**
 * Returns the association ends if the association is not a generalization, 
 * safely casting them to UMLRegularAssociationEnd. Returns null otherwise.
 */
export const getRegularAssociationEnds = (umlAssoc: UMLAssociation): UMLRegularAssociationEnd[] | null => {
  if (isGeneralizationAssociation(umlAssoc)) {
    return null;
  }
  return umlAssoc.ends as UMLRegularAssociationEnd[];
};
