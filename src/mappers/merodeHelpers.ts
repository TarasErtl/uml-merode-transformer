import { 
  type UMLAssociation, 
  type UMLAssociationEnd, 
  type UMLGeneralizationEnd,
  UMLLowerBound, 
  UMLUpperBound,
} from '../types/metamodels/uml';
import {
  type MerodeClass,
  type MerodeAttribute,
  type MerodeAssociation,
  MerodeMultiplicity,
  type MerodeBaseElement,
} from '../types/metamodels/merode';

/**
 * Helper function that replaces an existing association, by creating an intermediate class and connecting it to the original classes.
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be replaced
 * @param className the name of the new class that should be created to represent the binary association
 * @param assocNames the role names of the new associations
 * @return the id of the new class that has been created to represent the binary association
 */
export const createIntermediateClassForAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, className: string, assocNames: string[]) => {
  //extract the ends of the association that should be replaced, ignoring generalizations
  const ends = umlAssoc.ends.filter(
    (end): end is Exclude<UMLAssociationEnd, UMLGeneralizationEnd> => end.endType !== 'generalization'
  );

  const classId: string = `${umlAssoc.id}_Class`;
  const assocIds: string[] = ends.map((_, index) => `${umlAssoc.id}_assoc${index + 1}`);

  //Create the intermediate class
  createMerodeClass(merodeIR
                    , classId
                    , className
                    , []
                    , assocIds);

  //Create the associations between the new intermediate class and the original classes
  for (let i = 0; i < ends.length; i++) {
    createMerodeAssociation(merodeIR
                          , `${umlAssoc.id}_assoc${i + 1}`
                          , ''
                          , ends[i].targetClassId
                          , classId
                          , mapToMerodeMultiplicity(ends[i].lowerBound, ends[i].upperBound)
                          , assocNames[i]);
  }

  //delete the old associationId from the original classes and add the new associationId
  ends.forEach(end => {
      let originalClass: MerodeClass = merodeIR.get(end.targetClassId) as MerodeClass;
      originalClass.associationIds = [...originalClass.associationIds.filter(id => id !== umlAssoc.id) as string[]
                                      , `${umlAssoc.id}_assoc${ends.indexOf(end) + 1}`];
  });

  return classId;                        
}

/**
 * Helper function for creating Merode Classes
 * @param merodeIR the Map of the MerodeModelElements, to which the new class should be added
 * @param id the id of the new class
 * @param name the name of the new class
 * @param attributes the attributes of the new class
 * @param associationIds the ids of the associations of the new class
 */
export const createMerodeClass = (merodeIR: Map<string, MerodeBaseElement>,id: string, name: string, attributes: MerodeAttribute[], associationIds: string[]) => {
  const merodeClass: MerodeClass = {  
    id: id,
    type: 'merode:Class',
    name: name,
    attributes: attributes,
    associationIds: associationIds,
  };

  merodeIR.set(id, merodeClass);
}

/**
 * Helper function for creating Merode Associations
 * @param merodeIR the Map of the MerodeModelElements, to which the new association should be added
 * @param id the id of the new association
 * @param name the name of the new association
 * @param masterClassId the id of the master class of the new association
 * @param dependentClassId the id of the dependent class of the new association
 * @param multiplicity the multiplicity of the dependent class in the new association
 * @param roleName the role name of the dependent class in the new association
 * @param isGeneralization optional flag to mark the association as a generalization
 * @param isAbstract optional flag to mark if the generalization's superclass is abstract
 */
export const createMerodeAssociation = (
  merodeIR: Map<string, MerodeBaseElement>, 
  id: string, 
  name: string, 
  masterClassId: string, 
  dependentClassId: string, 
  multiplicity: MerodeMultiplicity, 
  roleName?: string,
  isGeneralization?: boolean,
  isAbstract?: boolean
) => {
  const merodeAssociation: MerodeAssociation = {
    id: id,
    type: 'merode:Association',
    name: name,
    masterClassId: masterClassId,
    dependentClassId: dependentClassId,
    multiplicity: multiplicity,
    roleName: roleName,
    isGeneralization,
    isAbstract,
  };

  merodeIR.set(id, merodeAssociation);
}

/**
 * Helper function to map the multiplicity of a UML association end to the multiplicity of a MERODE association
 * @param lower bound of the UML association end
 * @param upper bound of the UML association end
 * @returns MerodeMultiplicity type of the multiplicity of the dependent class in a MERODE association
 */
export const mapToMerodeMultiplicity = (lower: string, upper: string): MerodeMultiplicity => {
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.ZeroToMany;
  if (lower === UMLLowerBound.One && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.OneToMany;
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.One) return MerodeMultiplicity.ZeroToOne;
  return MerodeMultiplicity.OneToOne;
};