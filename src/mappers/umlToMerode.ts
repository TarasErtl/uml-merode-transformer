import { 
  type UMLIR,
  type UMLAssociation, 
  type UMLPackagedElement,
} from '../types/metamodels/uml';
import {
  type MerodeIR,
  type MerodeAttribute,
  type MerodeBaseElement,
  type MerodeModelElement,
} from '../types/metamodels/merode';
import type { Proposal, UnaryAssociationProposal, BinaryAssociationProposal, NAryAssociationProposal } from '../types/proposals';
import type { Decision, UnaryAssociationDecision, BinaryAssociationDecision, NAryAssociationDecision} from '../types/decisions';
import { createIntermediateClassForAssociation, createMerodeAssociation, createMerodeClass, mapToMerodeMultiplicity } from './merodeHelpers';
import { checkAggregationAssociation, checkExistenceDependency } from './merodeHeuristics';
import NAryAssociationProposalCard from '../components/NAryAssociationProposalCard';

/**
 * Maps an Unary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - creating an intermediate class and two new associations to this class
 * - if dafault values were used, returns a proposal
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision for the unary association
 * @return a UnaryAssociationProposal if there was no decision for the unary association yet, otherwise null
 */
const mapUnaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): UnaryAssociationProposal | null=> {
  const [end1, end2] = umlAssoc.ends;
  let classId: string = `${umlAssoc.id}_unary_Class`;
  let className: string = `${umlAssoc.name}_Class`;
  let assocName1: string = end1.roleName ?? '';
  let assocName2: string = end2.roleName ?? '';

  //if a decision has been made, use the values
  if (decisions.has(umlAssoc.id)) {
      className = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenClassName;
      assocName1 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole1Name;
      assocName2 = (decisions.get(umlAssoc.id) as UnaryAssociationDecision).chosenRole2Name;
  }

  //Creates a new class and twoe new associations, instead of the unary association
  createIntermediateClassForAssociation(merodeIR, umlAssoc, className, [assocName1, assocName2]);

  //if no decision present, create and return a proposal                      
  if (!decisions.has(umlAssoc.id)) {
    return {
        id: umlAssoc.id,
        proposedClassName: classId,
        proposedRole1Name: assocName1,
        proposedRole2Name: assocName2,
        message: `The association ${umlAssoc.id} is a unary association, it will be mapped by creating a new class ${className} and two associations between the new class and the original class`
      };
  }
  return null;                  
};

/**
 * Maps an Binary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - mapping the association
 *   - case 1 (existence dependency): creating a new association with master and dependent class
 *   - case 2 (no existence dependency): creating an intermediate class and two new associations between the new class and the original classes
 * - if default values were used, returns a proposal
 * The assuming of the existence dependency occurs by checking the multiplicity of the association ends, and whether it is an aggregation.
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

  //if a decision has been made, use the values
  if(decisions.has(umlAssoc.id)){
    const decision = decisions.get(umlAssoc.id) as BinaryAssociationDecision;
    isExistenceDependent = decision.chosenExistenceDependency;

    if (isExistenceDependent) {
      masterClassId = decision.chosenMasterClassId;
      dependentClassId = decision.chosenDependentClassId;
    }
    else {
      className = decision.chosenClassName!;
    }
  }
  //if no decision, check the ends for aggregation and muliplicity to assume existence dependency
  else {
    [isAggregation, masterClassId, dependentClassId] = checkAggregationAssociation(umlAssoc);
    
    if(isAggregation){
      isExistenceDependent = true;
    } else {
      [isExistenceDependent, masterClassId, dependentClassId] = checkExistenceDependency(end1, end2);
    }
  }
  
  //case 1: existence dependency is assumed or decided
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
  //case 2: non-existence dependency is assumed or decided
  else {
    //TODO bei dem Proposals und Decisions für die Binary auch die Roles für die Einzelnen Assocs abfragen?
    const classId: string = `${umlAssoc.id}_Class`;
    createIntermediateClassForAssociation(merodeIR, umlAssoc, className ?? classId, [end1.roleName ?? '', end2.roleName ?? '']);
  }

  //if no decision present, create and return a proposal
  if(!decisions.has(umlAssoc.id)){
    let retProposal: BinaryAssociationProposal;
    let message, masterclassName, dependentclassName: string;

    masterclassName = merodeIR.get(masterClassId!)?.name!;
    dependentclassName = merodeIR.get(dependentClassId!)?.name!;

    if(isExistenceDependent){
      message = `The association ${umlAssoc.id}, going between class: ${merodeIR.get(masterClassId!)?.name} and class: ${merodeIR.get(dependentClassId!)?.name} is proposed to be mapped as an existence dependent association. `
    } else {
      message =  `The association ${umlAssoc.id}, going between class: ${merodeIR.get(end1.targetClassId)?.name} and class: ${merodeIR.get(end2.targetClassId)?.name} is proposed to be mapped as a non-existence dependent association.
        A new class ${umlAssoc.id}_Class will be created to represent the association, and two new associations will be created between the new class and the original classes.`
    }

    return {
      id: umlAssoc.id,
      proposedExistenceDependency: isExistenceDependent,
      proposedMasterClassId: masterClassId!,
      proposedDependentClassId: dependentClassId!,
      proposedMasterClassName: masterclassName!,
      proposedDependentClassName: dependentclassName!,
      proposedClassName: `${umlAssoc.id}_Class`,
      proposedRole1Name: end1.roleName,
      proposedRole2Name: end2.roleName,
      message: message
    }
  }
  return null;
};

/**
 * Maps an N-ary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - creating an intermediate class and new associations to this class
 * - if default values were used, returns a proposal
 * 
 * @param MerodeIR 
 * @param umlAssoc 
 * @param decisions 
 * @returns 
 */
const mapNaryAssociation = (MerodeIR: Map<string, MerodeModelElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): NAryAssociationProposal | null => {
    const ends = umlAssoc.ends;
    let className: string = `${umlAssoc.id}_Class`;

    //if a decision has been made, use the values
    if(decisions.has(umlAssoc.id)){
      className = (decisions.get(umlAssoc.id) as NAryAssociationDecision).chosenClassName;
    }

    //Map the n-ary association by creating an intermediate class and associations to the original classes
    createIntermediateClassForAssociation(MerodeIR, umlAssoc, `${umlAssoc.name}_Class`, ends.map(end => end.roleName ?? ''));

    //if no decision present, create and return a proposal
    if (!decisions.has(umlAssoc.id)) {
      return {
        id: umlAssoc.id,
        proposedClassName: className,
        proposedRoleNames: ends.map(end => end.roleName ?? ''),
        message: `The association: "${umlAssoc.id}" is an n-ary association, and it will be mapped by creating a new intermediate class, please choose a name for the new class`
      };
    }
    return null;
};

/**
 * Maps a UML Model to a Merode IR Model
 * - first maps all the classes
 * - iterates over the UML associations and maps them depending on their type (unary, binary, n-ary)
 *  - if the some further information is needed, a proposal is created, which the user has to handle, to transform it to a decision
 * @param umlIR the UML Model to be mapped
 * @param decisions the Mapping decisions made by the user
 * @returns the Mapped Merode IR Model, as well as the Proposals to the user
 */
export const mapUmlToMerode = (umlIR: UMLIR, decisions: Map<string, Decision>): { merodeIR: MerodeIR | null, proposals: Proposal[] } => {
   const umlPackagedElements: readonly UMLPackagedElement[] = umlIR.model.packagedElement;
   const merodeIR: Map<string, MerodeModelElement> = new Map();
   const newProposals: Map<string, Proposal> = new Map();

   //First map all the classes, because every class in UML is also a class in Merode
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Class') {
            createMerodeClass(merodeIR, el.id, el.name, el.attributes as MerodeAttribute[], el.associationIds as string[]);
        }
   });

   //Mapp all the associations, depending on their type (unary, binary, n-ary)
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
                proposal = mapNaryAssociation(merodeIR, umlAssoc, decisions);
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