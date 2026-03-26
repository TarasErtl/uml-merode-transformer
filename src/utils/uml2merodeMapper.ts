import { 
  type UMLIR, 
  type UMLModel,
  type UMLClass, 
  type UMLAssociation, 
  type UMLAttribute, 
  type UMLAssociationEnd, 
  UMLLowerBound, 
  UMLUpperBound,
  UMLAggregationKind,
  type UMLPackagedElement,
} from '../types/uml';
import {
    MerodeElementStatus,
  type MerodeIR,
  type MerodeClass,
  type MerodeAttribute,
  type MerodeAssociation,
  MerodeMultiplicity,
} from '../types/merode';

// Hilfsfunktion zur Übersetzung der Multiplizitäten
const mapToMerodeMultiplicity = (lower: string, upper: string): MerodeMultiplicity => {
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.ZeroToMany;
  if (lower === UMLLowerBound.One && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.OneToMany;
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.One) return MerodeMultiplicity.ZeroToOne;
  return MerodeMultiplicity.OneToOne; // default
};

const mapClass = (umlClass: UMLClass, merodeClasses: MerodeClass[]) => {
  //All the Classes in the UML are Classes in MERODE, that means their don't need confirmation form the user
  const merodeClass: MerodeClass = {  
    id: umlClass.id,
    type: 'merode:Class',
    name: umlClass.name,
    attributes: umlClass.attributes.map(attr => ({
      id: attr.id,
      name: attr.name,
      type: 'merode:Attribute'
    })),
    associationIds: umlClass.associationIds,
    status: MerodeElementStatus.Confirmed
  };
  merodeClasses.push(merodeClass); 
};

/**
 * maps a unary association in UML to a MERODE class and two associations, that connect the new class with the original class of the unary association
 * and sets the status of the new elements to pending
 * @param umlAssoc 
 * @param merodeClasses 
 * @param merodeAssociations 
 */

const mapUnaryAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  const [end1, end2] = umlAssoc.ends;
  const originalClassId = end1.targetClassId;
  //TODO hier später den Namensvorschlag mit AI vorschlagen
  const newClassId = `${umlAssoc.id}_unary_class`;
  const newAssoc1Id = `${umlAssoc.id}_assoc1`;
  const newAssoc2Id = `${umlAssoc.id}_assoc2`;

  //Create a nem MERODE class for the unary association
  const newMerodeClass: MerodeClass = {
    id: newClassId,
    type: 'merode:Class',
    name: umlAssoc.id? `${umlAssoc.id}_unary_Class` : 'UnaryAssociationClass',
    attributes: [],
    associationIds: [newAssoc1Id, newAssoc2Id],
    status: MerodeElementStatus.Pending
  };
  merodeClasses.push(newMerodeClass);

  //Create two MERODE associations to connect the new class with the original class of the unary association
  const merodeAssoc1: MerodeAssociation = {
    id: newAssoc1Id,
    type: 'merode:Association',
    name: umlAssoc.name ? `${umlAssoc.name}_1` : undefined,
    masterClassId: originalClassId,
    dependentClassId: newClassId,
    multiplicity: mapToMerodeMultiplicity(end1.lowerBound, end1.upperBound),
    roleName: end1.roleName,
    status: MerodeElementStatus.Pending
  };
  
  const merodeAssoc2: MerodeAssociation = {
    id: newAssoc2Id,
    type: 'merode:Association',
    name: umlAssoc.name ? `${umlAssoc.name}_2` : undefined,
    masterClassId: originalClassId,
    dependentClassId: newClassId,
    multiplicity: mapToMerodeMultiplicity(end2.lowerBound, end2.upperBound),
    roleName: end2.roleName,
    status: MerodeElementStatus.Pending
  };
  merodeAssociations.push(merodeAssoc1, merodeAssoc2);

  //Delete the original unary association from the original class and add the two new associations
  const targetClass = merodeClasses.find(c => c.id === originalClassId);
  if (targetClass) {
    // Readonly umgehen, um die alte Assoziation durch die zwei neuen zu ersetzen
    (targetClass as any).associationIds = [
      ...targetClass.associationIds.filter(id => id !== umlAssoc.id),
      newAssoc1Id,
      newAssoc2Id
    ];
  }
};

const mapBinaryAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  const [end1, end2] = umlAssoc.ends;

  // Default mapping proposal: Assume an existence dependency exists.
  // We arbitrarily assign end1 as the master and end2 as the dependent.
  const merodeAssoc: MerodeAssociation = {
    id: umlAssoc.id,
    type: 'merode:Association',
    name: umlAssoc.name,
    masterClassId: end1.targetClassId,
    dependentClassId: end2.targetClassId,
    multiplicity: mapToMerodeMultiplicity(end2.lowerBound, end2.upperBound),
    roleName: end2.roleName,
    status: MerodeElementStatus.Pending
  };

  merodeAssociations.push(merodeAssoc);
};

const mapAggregationAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  // Case binary association with aggregation (shared or composite) (TODO)
};

const mapNaryAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  // Case n-ary Association (TODO)
};

export const mapUmlToMerode = (umlIR: UMLIR): MerodeIR | null => {
   if (!umlIR || !umlIR.model) return null;
    
   const umlPackagedElements: readonly UMLPackagedElement[] = umlIR.model.packagedElement;
   const merodeClasses: MerodeClass[] = [];
   const merodeAssociations: MerodeAssociation[] = [];

   //First map all the classes, because every class in UML is also a class in MERODE
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Class') {
            mapClass(el as UMLClass, merodeClasses);
        }
   });

   //Map all the associations, depending on their type (unary, binary, n-ary, aggregation)
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Association') {
            const umlAssoc = el as UMLAssociation;

            //Unary, Binary, Aggregation Association
            if (umlAssoc.ends.length === 2) {
                const end1 = umlAssoc.ends[0];
                const end2 = umlAssoc.ends[1];            
                const isUnary = end1.targetClassId === end2.targetClassId;
                const isAggregation = (end1.aggregation && end1.aggregation !== UMLAggregationKind.None) || 
                                      (end2.aggregation && end2.aggregation !== UMLAggregationKind.None);

                if (isUnary) {
                    mapUnaryAssociation(umlAssoc, merodeClasses, merodeAssociations);
                } else if (isAggregation) {
                    mapAggregationAssociation(umlAssoc, merodeClasses, merodeAssociations);
                } else {
                    mapBinaryAssociation(umlAssoc, merodeClasses, merodeAssociations);
                }
            } 
            //N-ary Association
            else {
                mapNaryAssociation(umlAssoc, merodeClasses, merodeAssociations);
            }
        }
    });

    return {
        model: {
            id: umlIR.model.id,
            type: 'merode:Model',
            name: umlIR.model.name,
            elements: [...merodeClasses, ...merodeAssociations]
        }
    };
}