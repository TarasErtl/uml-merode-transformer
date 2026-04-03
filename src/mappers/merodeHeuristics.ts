import { 
  type UMLAssociation, 
  type UMLAssociationEnd, 
  UMLLowerBound, 
  UMLUpperBound,
  UMLAggregationKind,
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
export const checkExistenceDependency = (end1: UMLAssociationEnd, end2: UMLAssociationEnd): [boolean, string, string] => {
  if (end1.upperBound === UMLUpperBound.One && end1.lowerBound === UMLLowerBound.One) {
    return [true, end1.targetClassId, end2.targetClassId];
  }
  if (end2.upperBound === UMLUpperBound.One && end2.lowerBound === UMLLowerBound.One) {
    return [true, end2.targetClassId, end1.targetClassId];
  }
  return [false, end1.targetClassId, end2.targetClassId];
};

/**
 * used to check whether one side of the association has an aggregation.
 * @param UMLAssociation the UML association that should be checked
 * @return tuple with first element (boolean) indicating whether the association is an aggregation,
 *        the second element is the id of the class on the aggregation side,
 *        the third element is the id of the class on the non-aggregation side
 */
export const checkAggregationAssociation = (umlAssoc: UMLAssociation): [boolean, string, string] => {
  const [end1, end2] = umlAssoc.ends;
  let isAggregation: boolean | undefined;
         
  isAggregation = (end1.aggregation && end1.aggregation !== UMLAggregationKind.None)
  if(isAggregation){
    return [true, end1.targetClassId, end2.targetClassId];
  }
  isAggregation = (end2.aggregation && end2.aggregation !== UMLAggregationKind.None);
  if(isAggregation){
    return [true, end2.targetClassId, end1.targetClassId];
  }
  return [false, end1.targetClassId, end2.targetClassId];
}