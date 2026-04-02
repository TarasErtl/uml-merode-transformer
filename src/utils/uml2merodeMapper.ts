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
import type { Proposal, UnaryAssociationProposal, BinaryAssociationProposal, BinaryAssociationExistenceDependentProposal, BinaryAssociationNoExistenceDependencyProposal } from '../types/proposals';
import type { Decision, UnaryAssociationDecision, BinaryAssociationDecision, BinaryAssociationExistenceDependentDecision, BinaryAssociationNoExistenceDependencyDecision} from '../types/decisions';
import { logger } from './logger';

/**
 * this method creates a intermediate Class between two or more classes, by replacing the existing binary association
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param className the name of the new class that should be created to represent the binary association
 * @param roleName1 the role name of the first association end of the new class
 * @param roleName2 the role name of the second association end of the new class
 * @return the id of the new class that has been created to represent the binary association
 */
const createIntermediateClassForAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, className: string, assocNames: string[]) => {
  let ends: UMLAssociationEnd[] = [];
  umlAssoc.ends.forEach(end => {
    ends.push(end);
  });

  const classId: string = `${umlAssoc.id}_Class`;
  const assoc1Id: string = `${umlAssoc.id}_assoc1`;
  const assoc2Id: string = `${umlAssoc.id}_assoc2`;

  //Create the class and the associations
  createMerodeClass(merodeIR
                    , classId
                    , className
                    , []
                    , [assoc1Id, assoc2Id]);

  for (let i = 0; i < ends.length; i++) {
    createMerodeAssociation(merodeIR
                          , `${umlAssoc.id}_assoc${i + 1}`
                          , ''
                          , ends[i].targetClassId
                          , classId
                          , mapToMerodeMultiplicity(ends[i].lowerBound, ends[i].upperBound)
                          , assocNames[i]);
  }

  //delete the associationId from the original class and add the new association ID
  ends.forEach(end => {
      let originalClass: MerodeClass = merodeIR.get(end.targetClassId) as MerodeClass;
      originalClass.associationIds = [...originalClass.associationIds.filter(id => id !== umlAssoc.id) as string[]
                                      , `${umlAssoc.id}_assoc${ends.indexOf(end) + 1}`];
  });

  return classId;                        
}

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
 * checks whether the association has upper and lower multiplicity of 1 on one side 
 * to decide whether existence dependecy should be assumed. Also says which end of
 * the given association should be the master and which one the dependent.
 * @param end1 the first association end of the UML association
 * @param end2 the second association end of the UML association
 * @return a tuple first element indicating whether existence dependency should be assumed, 
 *         the second element is the id of the master class
 *         the third element is the id of the dependent class
 */
const checkExistenceDependency = (end1: UMLAssociationEnd, end2: UMLAssociationEnd): [boolean, string, string] => {
  if (end1.upperBound === UMLUpperBound.One && end1.lowerBound === UMLLowerBound.One) {
    return [true, end1.targetClassId, end2.targetClassId];
  }
  if (end2.upperBound === UMLUpperBound.One && end2.lowerBound === UMLLowerBound.One) {
    return [true, end2.targetClassId, end1.targetClassId];
  }
  return [false, '', ''];
};

/**
 * checks whether the association is an aggregation association
 * @param UMLAssociation the UML association that should be checked
 * @return true if aggregation, and the ends target class as array, where the first is the rhombus end, if no aggregation false and null values
 */
const checkAggregationAssociation = (umlAssoc: UMLAssociation): [boolean, string, string] | [false, null, null] => {
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
  return [false, null, null];
}


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
  let className: string = `${umlAssoc.name}_Class`;
  let assocName1: string = end1.roleName ?? '';
  let assocName2: string = end2.roleName ?? '';

  //replace the default names with the chosen if a decision has been taken
  if (decisions.has(umlAssoc.id)) {
      className = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenClassName;
      assocName1 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole1Name;
      assocName2 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole2Name;
  }

  //Creates a new class and twoe new associations, instead of the unary association
  createIntermediateClassForAssociation(merodeIR, umlAssoc, className, [assocName1, assocName2]);

  //if the objects have been created without a decision, return a proposal, else return null                        
  if (decisions.has(umlAssoc.id)) {
    return null;
  }

  const retProposal: UnaryAssociationProposal = {
        id: umlAssoc.id,
        proposedClassName: classId,
        proposedRole1Name: assocName1,
        proposedRole2Name: assocName2,
        message: `The association ${umlAssoc.id} is a unary association, it will be mapped by creating a new class ${className} and two associations between the new class and the original class`
      };
  return retProposal;                      
};

/**
 * maps a binary association by:
 * by default checking whether one side of the association has a multiplicity of 1, then
 * assunming existence dependency, and creating a normal Merode association, otherwise assuming
 * non-existence dependency and creating a new class for the association and two new associations between 
 * the new class and the original classes.
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision for the unary associatio
 */
const mapBinaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): BinaryAssociationProposal | null=> {
  const [end1, end2] = umlAssoc.ends;
  let isExistenceDependent: boolean;
  let isAggregation: boolean;
  let masterClassId: string | null;
  let dependentClassId: string | null;
  let className: string = '';

  //first get the names for the classes if a decision is present
  if(decisions.has(umlAssoc.id)){
    const decision = decisions.get(umlAssoc.id) as BinaryAssociationDecision;
    isExistenceDependent = decision.chosenExistenceDependency;

    if (isExistenceDependent) {
      masterClassId = (decision as BinaryAssociationExistenceDependentDecision).chosenMasterClassId;
      dependentClassId = (decision as BinaryAssociationExistenceDependentDecision).chosenDependentClassId;
    }
    else {
      className = (decision as BinaryAssociationNoExistenceDependencyDecision).chosenClassName;
    }
  }
  //if there is no decision yet, check the multiplicity to decide whether to assume existence dependency in the proposal or not
  else {
    [isAggregation, masterClassId, dependentClassId] = checkAggregationAssociation(umlAssoc);
    
    if(isAggregation){
      isExistenceDependent = true;
    } else {
      [isExistenceDependent, masterClassId, dependentClassId] = checkExistenceDependency(end1, end2);
    }
  }
  
  //case: existence dependency is assumed or decided
  if(isExistenceDependent){
    const dependentEnd = umlAssoc.ends.find(end => end.targetClassId === dependentClassId);

    createMerodeAssociation(merodeIR
          , umlAssoc.id
          , umlAssoc.name
          , masterClassId!
          , dependentClassId!
          , mapToMerodeMultiplicity(dependentEnd!.lowerBound, dependentEnd!.upperBound)
          , dependentEnd!.roleName);
  }
  //case: non-existence dependency is assumed or decided
  else {
    const classId: string = `${umlAssoc.id}_Class`;
    createIntermediateClassForAssociation(merodeIR, umlAssoc, className ?? classId, [end1.roleName ?? '', end2.roleName ?? '']);
  }

  //if the object has been created based on a decision, no proposal is needed,
  if(!decisions.has(umlAssoc.id)){
    let retProposal: BinaryAssociationExistenceDependentProposal | BinaryAssociationNoExistenceDependencyProposal;

    if (isExistenceDependent){
      retProposal  = {
        id: umlAssoc.id,
        proposedExistenceDependency: true,
        proposedMasterClassId: masterClassId!,
        proposedDependentClassId: dependentClassId!,
        proposedMasterClassName: merodeIR.get(masterClassId!)?.name,
        proposedDependentClassName: merodeIR.get(dependentClassId!)?.name,
        message: `The association ${umlAssoc.id}, going between class: ${merodeIR.get(masterClassId!)?.name} and class: ${merodeIR.get(dependentClassId!)?.name} is proposed to be mapped as an existence dependent association. `
      };
    } else{
      retProposal  = {
        id: umlAssoc.id,
        proposedExistenceDependency: false,
        proposedClassName: `${umlAssoc.id}_Class`,
        proposedRole1Name: end1.roleName,
        proposedRole2Name: end2.roleName,
        class1Name: merodeIR.get(end1.targetClassId)?.name,
        class2Name: merodeIR.get(end2.targetClassId)?.name,
        message: `The association ${umlAssoc.id}, going between class: ${merodeIR.get(end1.targetClassId)?.name} and class: ${merodeIR.get(end2.targetClassId)?.name} is proposed to be mapped as a non-existence dependent association.
        A new class ${umlAssoc.id}_Class will be created to represent the association, and two new associations will be created between the new class and the original classes.`
      };

    }
    return retProposal;
  }
  return null;
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

   //Map all the associations, depending on their type call the 
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Association') {
            let proposal: Proposal | null = null;
            const umlAssoc = el as UMLAssociation;

            //Unary, Binary, Aggregation Association
            if (umlAssoc.ends.length === 2) {          
                //Unary Association
                if (umlAssoc.ends[0].targetClassId === umlAssoc.ends[1].targetClassId) {
                  proposal = mapUnaryAssociation(merodeIR, umlAssoc, decisions);
                }
                //Binary Association (as well as aggregation)
                else {
                  proposal = mapBinaryAssociation(merodeIR, umlAssoc, decisions);
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