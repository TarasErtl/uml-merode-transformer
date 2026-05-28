import { 
  type UMLIR,
  type UMLAssociation, 
  type UMLPackagedElement,
  type UMLClass,
  type UMLAssociationClass,
  type UMLRegularAssociationEnd,
} from '../types/metamodels/uml';
import {
  type MerodeIR,
  type MerodeAttribute,
  type MerodeOperation,
  type MerodeBaseElement,
  type MerodeModelElement,
  MerodeMultiplicity,
} from '../types/metamodels/merode';
import type { Proposal, UnaryAssociationProposal, BinaryAssociationProposal, NAryAssociationProposal, EventsProposal, BusinessEventItem } from '../types/proposals';
import type { Decision, UnaryAssociationDecision, BinaryAssociationDecision, NAryAssociationDecision, EventsDecision} from '../types/decisions';
import { createIntermediateClass, createMerodeAssociation, createMerodeClass, mapToMerodeMultiplicity } from './merodeBuilder';
import { checkAggregationAssociation, checkExistenceDependency, getRegularAssociationEnds, type AnalyzerReturn } from './umlAnalyzer';

/**
 * Maps an Unary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - creating an intermediate class and two new associations to this class
 * - if dafault values were used, returns a proposal
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision for the unary association
 * @returns a Proposal if there was no decicion, otherwise null
 */
const mapUnaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): UnaryAssociationProposal | null=> {
  const [end1, end2]  = getRegularAssociationEnds(umlAssoc);
  const decision = decisions.get(umlAssoc.id) as UnaryAssociationDecision | undefined;

  // Determine names based on the decision or use fallback default values
  //TODO hier AI suggestion einbauen
  const className = decision?.chosenClassName || '';
  const assocName1 = decision?.chosenRole1Name || end1.roleName || '';
  const assocName2 = decision?.chosenRole2Name || end2.roleName || '';

  // Create the intermediate Class and the connection Associations in the Merode-IR
  createIntermediateClass(merodeIR, umlAssoc, className, [assocName1, assocName2]);

  //create proposal if there was no decision
  if (decision) return null;
  return {
    id: umlAssoc.id,
    proposedClassName: className,
    proposedRole1Name: assocName1,
    proposedRole2Name: assocName2,
    message: `The association is a unary association, it will be mapped by creating a new class and two associations`
  };
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
 * @param decisions the Map of the decisions, to check if there is already a decision for the unary association
 * @returns a Proposal if there was no decicion, otherwise null
 */
const mapBinaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): BinaryAssociationProposal | null=> {
  const associationEnds = getRegularAssociationEnds(umlAssoc);
  const [end1, end2]  = associationEnds;
  const decision = decisions.get(umlAssoc.id) as BinaryAssociationDecision | undefined;

  let isExistenceDependent = false;
  // Initialize with end1 and end2. If not existence dependent, they store the adjacent classes.
  let masterClassId: string = end1.targetClassId;
  let dependentClassId: string = end2.targetClassId;
  let className: string = '';


  // if decision present use the data
  if (decision) {
    isExistenceDependent = decision.chosenExistenceDependency;
    masterClassId = decision.chosenMasterClassId || '';
    dependentClassId = decision.chosenDependentClassId || '';
    className = decision.chosenClassName || '';
  } else {
    // If no decision exists, use heuristics predict the existence dependency
    let analyzerReturn: AnalyzerReturn = checkAggregationAssociation(umlAssoc);
    if (analyzerReturn.response) {
      isExistenceDependent = true;
      masterClassId = analyzerReturn.masterClassId;
      dependentClassId = analyzerReturn.dependentClassId;
    } else {
      analyzerReturn = checkExistenceDependency(umlAssoc);
      isExistenceDependent = analyzerReturn.response;
      if (analyzerReturn.response){
        masterClassId = analyzerReturn.masterClassId;
        dependentClassId = analyzerReturn.dependentClassId;
      }
    }
  }

  if (isExistenceDependent) {
    // Case 1: Existence dependency is assumed or decided. Create a direct Master-Dependent association.
    const dependentEnd: UMLRegularAssociationEnd = associationEnds.find(end => end.targetClassId === masterClassId) || end2;
    createMerodeAssociation(
      merodeIR,
      umlAssoc.id,
      umlAssoc.name,
      masterClassId,
      dependentClassId,
      mapToMerodeMultiplicity(dependentEnd.lowerBound, dependentEnd.upperBound),
      dependentEnd.roleName
    );
  } else {
    // Case 2: Non-existence dependency is assumed or decided. Create an intermediate class.
    const role1 = decision?.chosenRole1Name ?? end1.roleName ?? '';
    const role2 = decision?.chosenRole2Name ?? end2.roleName ?? '';
    createIntermediateClass(merodeIR, umlAssoc, className, [role1, role2]);
  }

  if (decision) return null;

  const masterName = merodeIR.get(masterClassId)?.name;
  const dependentName = merodeIR.get(dependentClassId)?.name;

  const message = isExistenceDependent
    ? `The association, between class: ${masterName} and class: ${dependentName}, is proposed to be mapped as an existence dependent association.`
    : `The association, between class: ${masterName} and class: ${dependentName}, is proposed to be mapped as a non-existence dependent association. An intermediate class will be created.`;

  return {
    id: umlAssoc.id,
    proposedExistenceDependency: isExistenceDependent,
    proposedMasterClassId: masterClassId,
    proposedDependentClassId: dependentClassId,
    proposedMasterClassName: masterName!,
    proposedDependentClassName: dependentName!,
    proposedClassName: className,
    proposedRole1Name: end1.roleName,
    proposedRole2Name: end2.roleName,
    message
  };
};

/**
 * Maps an N-ary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - creating an intermediate class and new associations to this class
 * - if default values were used, returns a proposal
 * @param MerodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision
 * @returns a Proposal if there was no decicion, otherwise null
 */
const mapNaryAssociation = (MerodeIR: Map<string, MerodeModelElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): NAryAssociationProposal | null => {
    const ends = getRegularAssociationEnds(umlAssoc);
    const decision = decisions.get(umlAssoc.id) as NAryAssociationDecision | undefined;
    
    const className = decision?.chosenClassName || '';
    const roleNames = decision?.chosenRoleNames ?? ends.map(end => end.roleName ?? '');

    // Map the n-ary association by creating a central intermediate class and associations to the original classes
    createIntermediateClass(MerodeIR, umlAssoc, className, roleNames);

    if (decision) return null;

    return {
      id: umlAssoc.id,
      proposedClassName: className,
      proposedRoleNames: ends.map(end => end.roleName ?? ''),
      message: `The association is an n-ary association, and it will be mapped by creating a new intermediate class, please choose a name for the new class`
    };
};

/**
 * Maps an generalisation Association from UML to Merode, by:
 * - checking whether the super class is abstract, and based on that creating an "abstract" generalisation or a normal generalisation
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added 
 * @param umlAssoc the UML association that should be mapped
 * @param umlClasses The list of UML classes to look up the superclass details.
 */
const mapGeneralisationAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, umlClasses: UMLClass[]) => {
  const superclassId = umlAssoc.ends.find(end => end.endType === 'generalization')!.targetClassId;
  const subclassId = umlAssoc.ends.find(end => end.endType !== 'generalization')!.targetClassId;

  // Find the superclass in the original UML classes to check if it's abstract
  const superclass = umlClasses.find(cls => cls.id === superclassId);

  // A generalization is a 1..1 existence dependency in MERODE.
  // Superclass is the master, Subclass is the dependent.
  createMerodeAssociation(
    merodeIR,
    umlAssoc.id,
    umlAssoc.name,
    superclassId,
    subclassId,
    MerodeMultiplicity.OneToOne,
    undefined, // roleName
    true, // isGeneralization
    superclass?.isAbstract || false // isAbstract
  );
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

  const umlClasses = umlPackagedElements.filter(el => el.type === 'uml:Class') as UMLClass[];
  const umlAssociationClasses = umlPackagedElements.filter(el => el.type === 'uml:AssociationClass') as UMLAssociationClass[];
  const umlAssociations = umlPackagedElements.filter(el => el.type === 'uml:Association') as UMLAssociation[];

  const eventsDecision = decisions.get('global-events-proposal') as EventsDecision | undefined;
  const allEvents: BusinessEventItem[] = [];

  //Mapping of the Classes
  umlClasses.forEach(el => {
    let filteredOperations = el.operations as MerodeOperation[];
    
    if (eventsDecision && eventsDecision.events) {
      const businessEventIds = new Set(eventsDecision.events.filter(e => e.isBusinessEvent).map(e => e.operationId));
      filteredOperations = filteredOperations.filter(op => businessEventIds.has(op.id));
    } else {
      el.operations.forEach(op => {
        allEvents.push({
          operationId: op.id,
          operationName: op.name,
          classId: el.id,
          className: el.name,
          isBusinessEvent: true // Marked as included by default
        });
      });
    }

    createMerodeClass(merodeIR, el.id, el.name, el.attributes as MerodeAttribute[], filteredOperations, el.associationIds as string[]);
  });

  if (!eventsDecision && allEvents.length > 0) {
    const globalEventsProposal: EventsProposal = {
      id: 'global-events-proposal',
      type: 'eventsProposal',
      events: allEvents,
      message: 'Please select which events (operations) should remain as business events in the Merode model.'
    };
    newProposals.set(globalEventsProposal.id, globalEventsProposal);
  }

  //Mapping of the Associations, depending on their type (unary, binary, n-ary)
  umlAssociations.forEach(el => {
    let proposal: Proposal | null = null;
    const umlAssoc = el as UMLAssociation;

    // Unary, Binary, Aggregation Association
    if (umlAssoc.ends.length === 2) {          
        // Check if it's a Unary Association (both ends point to the same class)
        if (umlAssoc.ends[0].targetClassId === umlAssoc.ends[1].targetClassId) {
          proposal = mapUnaryAssociation(merodeIR, umlAssoc, decisions);
        }
        // check if its a generalisation/specialisation
        else if (umlAssoc.ends[0].endType === 'generalization' || umlAssoc.ends[1].endType === 'generalization') {
          // No proposal needed, as it's a direct mapping
          mapGeneralisationAssociation(merodeIR, umlAssoc, umlClasses);
        }
        // Binary Association (as well as aggregation)
        else {
          proposal = mapBinaryAssociation(merodeIR, umlAssoc, decisions);
        }              
    }
    // N-ary Association
    else {
        proposal = mapNaryAssociation(merodeIR, umlAssoc, decisions);
    }

    if (proposal){
      console.log("Generated proposal for association:", proposal);  
      newProposals.set(proposal.id, proposal);
    }
  });

  //Mapping of the Association Classes
  umlAssociationClasses.forEach(el => {
    createIntermediateClass(merodeIR, el, el.name, el.associationIds as string[]);
  });

  return {
      merodeIR: {
          model: {
              id: umlIR.model.id,
              type: 'merode:Model',
              name: umlIR.model.name,
              elements: Array.from(merodeIR.values())
          }
      },
      proposals: Array.from(newProposals.values())
  };
}