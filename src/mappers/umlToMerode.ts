import { 
  type UMLIR,
  type UMLAssociation, 
  type UMLPackagedElement,
  type UMLAssociationEnd,
  type UMLClass,
} from '../types/metamodels/uml';
import {
  type MerodeIR,
  type MerodeAttribute,
  type MerodeBaseElement,
  type MerodeModelElement,
  MerodeMultiplicity,
} from '../types/metamodels/merode';
import type { Proposal, UnaryAssociationProposal, BinaryAssociationProposal, NAryAssociationProposal } from '../types/proposals';
import type { Decision, UnaryAssociationDecision, BinaryAssociationDecision, NAryAssociationDecision} from '../types/decisions';
import { createIntermediateClassForAssociation, createMerodeAssociation, createMerodeClass, mapToMerodeMultiplicity } from './merodeHelpers';
import { checkAggregationAssociation, checkExistenceDependency, getRegularAssociationEnds } from './merodeHeuristics';
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
  const associationEnds = getRegularAssociationEnds(umlAssoc);
  if (!associationEnds) return null;

  const [end1, end2] = associationEnds;
  const decision = decisions.get(umlAssoc.id) as UnaryAssociationDecision | undefined;

  // Determine names based on the decision or use fallback default values
  const classId = `${umlAssoc.id}_unary_Class`;
  const className = decision?.chosenClassName || `${umlAssoc.name || umlAssoc.id}_Class`;
  const assocName1 = decision?.chosenRole1Name || end1.roleName || '';
  const assocName2 = decision?.chosenRole2Name || end2.roleName || '';

  // Map the unary association by creating an intermediate class
  createIntermediateClassForAssociation(merodeIR, umlAssoc, className, [assocName1, assocName2]);

  if (decision) return null;

  return {
    id: umlAssoc.id,
    proposedClassName: classId,
    proposedRole1Name: assocName1,
    proposedRole2Name: assocName2,
    message: `The association ${umlAssoc.id} is a unary association, it will be mapped by creating a new class ${className} and two associations between the new class and the original class`
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
 */
const mapBinaryAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): BinaryAssociationProposal | null=> {
  const associationEnds = getRegularAssociationEnds(umlAssoc);
  if (!associationEnds) return null;

  const [end1, end2] = associationEnds;
  const decision = decisions.get(umlAssoc.id) as BinaryAssociationDecision | undefined;

  let isExistenceDependent = false;
  let masterClassId = '';
  let dependentClassId = '';
  let className = `${umlAssoc.id}_Class`;

  // Determine existence dependency based on the decision or use heuristics
  if (decision) {
    isExistenceDependent = decision.chosenExistenceDependency;
    masterClassId = decision.chosenMasterClassId || '';
    dependentClassId = decision.chosenDependentClassId || '';
    className = decision.chosenClassName || className;
  } else {
    // If no decision exists, use heuristics to predict the existence dependency
    const [isAggregation, aggMaster, aggDependent] = checkAggregationAssociation(umlAssoc);
    if (isAggregation) {
      isExistenceDependent = true;
      masterClassId = aggMaster;
      dependentClassId = aggDependent;
    } else {
      const [isDep, depMaster, depDependent] = checkExistenceDependency(end1, end2);
      isExistenceDependent = isDep;
      masterClassId = depMaster;
      dependentClassId = depDependent;
    }
  }
  
  // Ensure we always have valid IDs for the proposal's state
  const finalMasterClassId = masterClassId || end1.targetClassId;
  const finalDependentClassId = dependentClassId || end2.targetClassId;

  if (isExistenceDependent) {
    // Case 1: Existence dependency is assumed or decided. Create a direct Master-Dependent association.
    const dependentEnd = associationEnds.find(end => end.targetClassId === finalDependentClassId) || end2;
    createMerodeAssociation(
      merodeIR,
      umlAssoc.id,
      umlAssoc.name,
      finalMasterClassId,
      finalDependentClassId,
      mapToMerodeMultiplicity(dependentEnd.lowerBound, dependentEnd.upperBound),
      dependentEnd.roleName
    );
  } else {
    // Case 2: Non-existence dependency is assumed or decided. Create an intermediate class.
    // TODO: Query roles for the individual associations in the proposals and decisions for binary associations?
    createIntermediateClassForAssociation(merodeIR, umlAssoc, className, [end1.roleName ?? '', end2.roleName ?? '']);
  }

  if (decision) return null;

  const class1Name = merodeIR.get(end1.targetClassId)?.name || '';
  const class2Name = merodeIR.get(end2.targetClassId)?.name || '';
  const masterName = merodeIR.get(finalMasterClassId)?.name || '';
  const dependentName = merodeIR.get(finalDependentClassId)?.name || '';

  const message = isExistenceDependent
    ? `The association ${umlAssoc.name ? `"${umlAssoc.name}" (${umlAssoc.id})` : umlAssoc.id}, between class: ${masterName} and class: ${dependentName}, is proposed to be mapped as an existence dependent association.`
    : `The association ${umlAssoc.name ? `"${umlAssoc.name}" (${umlAssoc.id})` : umlAssoc.id}, between class: ${class1Name} and class: ${class2Name}, is proposed to be mapped as a non-existence dependent association. An intermediate class will be created.`;

  return {
    id: umlAssoc.id,
    proposedExistenceDependency: isExistenceDependent,
    proposedMasterClassId: finalMasterClassId,
    proposedDependentClassId: finalDependentClassId,
    proposedMasterClassName: masterName,
    proposedDependentClassName: dependentName,
    class1Id: end1.targetClassId,
    class2Id: end2.targetClassId,
    class1Name,
    class2Name,
    proposedClassName: className,
    proposedRole1Name: end1.roleName,
    proposedRole2Name: end2.roleName,
    message
  } as BinaryAssociationProposal;
};

/**
 * Maps an N-ary UML Association to Merode, by:
 * - getting the mapping information from a decision if it is present, otherwise uses default values
 * - creating an intermediate class and new associations to this class
 * - if default values were used, returns a proposal
 * @param MerodeIR the Map of the MerodeModelElements, to which the new class and associations should be added
 * @param umlAssoc the UML association that should be mapped
 * @param decisions the Map of the decisions, to check if there is already a decision
 * @returns 
 */
const mapNaryAssociation = (MerodeIR: Map<string, MerodeModelElement>, umlAssoc: UMLAssociation, decisions: Map<string, Decision>): NAryAssociationProposal | null => {
    const ends = getRegularAssociationEnds(umlAssoc);
    if (!ends) return null;

    const decision = decisions.get(umlAssoc.id) as NAryAssociationDecision | undefined;
    const className = decision?.chosenClassName || `${umlAssoc.name || umlAssoc.id}_Class`;

    // Map the n-ary association by creating a central intermediate class and associations to the original classes
    createIntermediateClassForAssociation(MerodeIR, umlAssoc, className, ends.map(end => end.roleName ?? ''));

    if (decision) return null;

    return {
      id: umlAssoc.id,
      proposedClassName: className,
      proposedRoleNames: ends.map(end => end.roleName ?? ''),
      message: `The association: "${umlAssoc.name || umlAssoc.id}" is an n-ary association, and it will be mapped by creating a new intermediate class, please choose a name for the new class`
    };
};

/**
 * Maps an generalisation Association from UML to Merode, by checking whether the super class is abstract, and based on that creating 
 * an "abstract" generalisation or a normal generalisation
 * @param merodeIR the Map of the MerodeModelElements, to which the new class and associations should be added 
 * @param umlAssoc the UML association that should be mapped
 * @param umlClasses The list of UML classes to look up the superclass details.
 */
const mapGeneralisationAssociation = (merodeIR: Map<string, MerodeBaseElement>, umlAssoc: UMLAssociation, umlClasses: UMLClass[]) => {
  const superclassEnd = umlAssoc.ends.find(end => end.endType === 'generalization');
  const subclassEnd = umlAssoc.ends.find(end => end.endType !== 'generalization');

  if (!superclassEnd || !subclassEnd) {
    return; // Should not happen for valid generalization from parser
  }

  const superclassId = superclassEnd.targetClassId;
  const subclassId = subclassEnd.targetClassId;

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

   // First map all the classes, because every class in UML is also a class in MERODE
   umlClasses.forEach(el => {
        createMerodeClass(merodeIR, el.id, el.name, el.attributes as MerodeAttribute[], el.associationIds as string[]);
   });

   // Map all the associations, depending on their type (unary, binary, n-ary)
   umlPackagedElements.forEach(el => {
        if (el.type === 'uml:Association') {
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
        }
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