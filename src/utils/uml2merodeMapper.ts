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
  type MerodeIR,
  type MerodeClass,
  type MerodeAttribute,
  type MerodeAssociation,
  MerodeMultiplicity,
  type MerodeBaseElement,
  type MerodeModelElement,
} from '../types/merode';
import type { Proposal, UnaryAssociationProposal } from '../types/proposals';
import type { Decision, UnaryAssociationDecision } from '../types/decisions';


/**
 * Helper Class for creating MERODE elements
 * Creates a new MERODE class and adds it to the MERODE IR
 * @param merodeIR the Map of the MerodeModelElements, to which the new class should be added
 * @param id the id of the new class
 * @param name the name of the new class
 * @param attributes the attributes of the new class
 * @param associationIds the ids of the associations of the new class
 */
const createMerodeClass = (merodeIR: Map<string, MerodeBaseElement>,id: string, name: string, attributes: MerodeAttribute[], associationIds: string[]) => {
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
 * Helper Class for creating MERODE associations
 * Creates a new MERODE association and adds it to the MERODE IR
 * @param merodeIR the Map of the MerodeModelElements, to which the new association should be added
 * @param id the id of the new association
 * @param name the name of the new association
 * @param masterClassId the id of the master class of the new association
 * @param dependentClassId the id of the dependent class of the new association
 * @param multiplicity the multiplicity of the dependent class in the new association
 * @param roleName the role name of the dependent class in the new association
 */
const createMerodeAssociation = (merodeIR: Map<string, MerodeBaseElement>, id: string, name: string, masterClassId: string, dependentClassId: string, multiplicity: MerodeMultiplicity, roleName?: string) => {
  const merodeAssociation: MerodeAssociation = {
    id: id,
    type: 'merode:Association',
    name: name,
    masterClassId: masterClassId,
    dependentClassId: dependentClassId,
    multiplicity: multiplicity,
    roleName: roleName,
  };
  merodeIR.set(id, merodeAssociation);
}

/**
 * This is a Helper function to map the multiplicity of a UML association end to the multiplicity of a MERODE association
 * @param lower bound of the UML association end
 * @param upper bound of the UML association end
 * @returns MerodeMultiplicity type of the multiplicity of the dependent class in a MERODE association
 */
const mapToMerodeMultiplicity = (lower: string, upper: string): MerodeMultiplicity => {
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.ZeroToMany;
  if (lower === UMLLowerBound.One && upper === UMLUpperBound.Unlimited) return MerodeMultiplicity.OneToMany;
  if (lower === UMLLowerBound.Zero && upper === UMLUpperBound.One) return MerodeMultiplicity.ZeroToOne;
  return MerodeMultiplicity.OneToOne; // default
};

/**
 * maps a unary association by:
 * creating a new class for the unary association, creating two new associations between the new class and the original class,
 * the user is asked to choose the name of the new class and the role names of the new associations in a proposal,
 * if there is no decision for the unary association yet
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision for the unary association
 * @return a UnaryAssociationProposal if there is no decision for the unary association yet, otherwise null
 */
const mapUnaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): UnaryAssociationProposal | null=> {
  const [end1, end2] = umlAssoc.ends;
  let classId: string = `${umlAssoc.id}_unary_Class`;
  let assoc1Id: string = `${umlAssoc.id}_assoc1`;
  let assoc2Id: string = `${umlAssoc.id}_assoc2`;
  let className: string = '';
  let assocName1: string = end1.roleName ?? '';
  let assocName2: string = end2.roleName ?? '';

  if (decisions.has(umlAssoc.id)) {
      className = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenClassName;
      assocName1 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole1Name;
      assocName2 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole2Name;
  }

  //Create the classes and the associations
  createMerodeClass(merodeIR
                    , classId
                    , className ?? `${umlAssoc.name}_Class`
                    , []
                    , [assoc1Id, assoc2Id]);
  createMerodeAssociation(merodeIR
                          , assoc1Id
                          , assocName1 ??  assoc1Id
                          , end1.targetClassId
                          , classId
                          , mapToMerodeMultiplicity(end1.lowerBound, end1.upperBound)
                          , assocName1);
  createMerodeAssociation(merodeIR
                          , assoc2Id
                          , assocName2 ?? assoc2Id
                          , end1.targetClassId
                          , classId
                          , mapToMerodeMultiplicity(end2.lowerBound, end2.upperBound)
                          , assocName2);

  //delete the associationId of the original class and add the new associations
  let originalClass: MerodeClass = merodeIR.get(end1.targetClassId) as MerodeClass;
  originalClass.associationIds = [...originalClass.associationIds.filter(id => id !== umlAssoc.id) as string[]
                                 , assoc1Id
                                 , assoc2Id];


  //if the object has been created based on a decision, no proposal is needed, 
  // otherwise create a proposal for the user to choose the names of the new class and associations                          
  if (decisions.has(umlAssoc.id)) {
    return null;
  }
  const retProposal: UnaryAssociationProposal = {
        id: umlAssoc.id,
        proposedClassName: classId,
        proposedRole1Name: assocName1,
        proposedRole2Name: assocName2     
      };
  return retProposal;                      
};

const mapBinaryAssociation = (umlAssoc: UMLAssociation, merodeClasses: Map<string, MerodeClass>, merodeAssociations: Map<string, MerodeAssociation>, decisions: Map<string, Decision>) => {

};

const mapAggregationAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  // Case binary association with aggregation (shared or composite) (TODO)
};

const mapNaryAssociation = (umlAssoc: UMLAssociation, merodeClasses: MerodeClass[], merodeAssociations: MerodeAssociation[]) => {
  // Case n-ary Association (TODO)
};

export const mapUmlToMerode = (umlIR: UMLIR, decisions: Map<string, Decision>): { merodeIR: MerodeIR | null, proposals: Proposal[] } => {
   if (!umlIR || !umlIR.model) {
    return { merodeIR: null, proposals: [] };
   }
    
   const umlPackagedElements: readonly UMLPackagedElement[] = umlIR.model.packagedElement;
   const merodeIR: Map<string, MerodeModelElement> = new Map();
   const newProposals: Map<string, Proposal> = new Map();

   //First map all the classes, because every class in UML is also a class in MERODE
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Class') {
            createMerodeClass(merodeIR, el.id, el.name, el.attributes as MerodeAttribute[], el.associationIds as string[]);
        }
   });

   //Map all the associations, depending on their type (unary, binary, n-ary, aggregation)
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Association') {
            let proposal: Proposal | null = null;
            const umlAssoc = el as UMLAssociation;

            //Unary, Binary, Aggregation Association
            if (umlAssoc.ends.length === 2) {
                const end1 = umlAssoc.ends[0];
                const end2 = umlAssoc.ends[1];            
                const isUnary = end1.targetClassId === end2.targetClassId;
                const isAggregation = (end1.aggregation && end1.aggregation !== UMLAggregationKind.None) || 
                                      (end2.aggregation && end2.aggregation !== UMLAggregationKind.None);

                if (isUnary) {
                  proposal = mapUnaryAssociation(merodeIR, umlAssoc, decisions);
                } else if (isAggregation) {
                    //proposal = mapAggregationAssociation(umlAssoc, merodeIR, decisions);
                } else {
                  //proposal = mapBinaryAssociation(umlAssoc, merodeIR, decisions);
                }
            }
            //N-ary Association
            else {
                //proposal = mapNaryAssociation(umlAssoc, merodeClasses, merodeAssociations);
            }

            if (proposal){
              console.log("Generated proposal for association:", proposal);  
              newProposals.set(proposal.id, proposal);
            }
        }
    });

    return {
        merodeIR: {
            model: {
                id: umlIR.model.id,
                type: 'merode:Model',
                name: umlIR.model.name,
                elements: [...merodeIR.values()]
            }
        },
        proposals: Array.from(newProposals.values())
    };
}