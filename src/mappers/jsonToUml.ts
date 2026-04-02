import { 
  type UMLIR, 
  type UMLClass, 
  type UMLAssociation, 
  type UMLAttribute, 
  type UMLAssociationEnd, 
  UMLLowerBound, 
  UMLUpperBound,
  UMLAggregationKind,
} from '../types/metamodels/uml';
import {
  type XmiJsonData,
  type XmiJsonModel,
  type XmiJsonClass,
  type XmiJsonAssociation,
  type XmiJsonOwnedAttribute,
  type XmiJsonBaseElement
} from '../types/metamodels/xmiJson';

/**
 * Helper function to ensure we always work with arrays, even if the XMI parser returns a single object for singular elements.
 * @param val - The value that may be an array, a single object, or undefined.
 * @returns An array of the given value(s).
 */
const ensureArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

/**
 * Maps XMI multiplicity values to our internal types.
 * @param attr - The XMI attribute
 * @returns An object containing the lower and upper bounds of the multiplicity.
 */
const mapMultiplicity = (attr: XmiJsonOwnedAttribute): { lower: UMLLowerBound; upper: UMLUpperBound } => {
  // UML standard: If the node is completely missing, the value is 1. 
  // If the node is present but the 'value' attribute is missing, XMI usually implies the value 0.
  const lowerValue = attr.lowerValue 
    ? (attr.lowerValue.value !== undefined ? String(attr.lowerValue.value) : "0")
    : "1";
    
  const upperValue = attr.upperValue 
    ? (attr.upperValue.value !== undefined ? String(attr.upperValue.value) : "1")
    : "1";

  return {
    lower: (lowerValue === "1" ? UMLLowerBound.One : UMLLowerBound.Zero) as UMLLowerBound,
    upper: (upperValue === "*" ? UMLUpperBound.Unlimited : UMLUpperBound.One) as UMLUpperBound
  };
};

/**
 * Builds a lookup table for all relevant elements to allow fast cross-referencing by ID.
 * @param packagedElements - The array of classes and associations from the parsed XMI JSON.
 * @returns A dictionary mapping an element's ID to the element itself or its owned attributes.
 */
const buildElementLookup = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation)[]
): Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> => {
  const elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> = {};
  
  packagedElements.forEach(el => {
    //store the element itself in the lookup table, using its xmi:id as the key
    elementLookup[el["xmi:id"]] = el;

    //if a class, then also add all the attributes
    if ((el as XmiJsonClass).ownedAttribute) {
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonClass).ownedAttribute).forEach(attr => {
        //store the attribute, and add the parent class ID to the attr
        elementLookup[attr["xmi:id"]] = attr;
        attr._parentClassId = el["xmi:id"];
      });
    }

    //if a association, then add all the ownedEnds
    if ((el as XmiJsonAssociation).ownedEnd) {
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonAssociation).ownedEnd).forEach(attr => {
        elementLookup[attr["xmi:id"]] = attr;
      });
    }
  });
  
  return elementLookup;
};

/**
 * Processes all associations, creating the UMLAssociation objects and populating the classAssocMap.
 * @param packagedElements - The array of classes and associations from the parsed XMI JSON.
 * @param elementLookup - A lookup table mapping element IDs to their respective objects.
 * @param classAssocMap - A map that will be populated with class IDs as keys and sets of association IDs as values.
 * @returns An array containing the processed UMLAssociation objects.
 */
const processAssociations = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation)[],
  elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute>,
  classAssocMap: Record<string, Set<string>>
): UMLAssociation[] => {
  const associations: UMLAssociation[] = [];

  packagedElements.forEach(el => {
    if (el["xmi:type"] === "uml:Association") {
      const umlAssociation = el as XmiJsonAssociation;
      
      // the memberEnd can be either a string of space-separated IDs or an array of IDs
      let memberEndIds: string[] = [];
      if (typeof umlAssociation.memberEnd === "string") {
        memberEndIds = umlAssociation.memberEnd.split(/\s+/);
      } else if (Array.isArray(umlAssociation.memberEnd)) {
        memberEndIds = umlAssociation.memberEnd;
      }
      memberEndIds = memberEndIds.filter(Boolean);

      // looking up the member ends in the lookup table
      const ends = memberEndIds.map(id => {
        const attr = elementLookup[id] as XmiJsonOwnedAttribute;
        if (!attr || !attr.type) return null;

        // Map the target class to this association, attr.type is the target class ID
        if (!classAssocMap[attr.type]) {
          classAssocMap[attr.type] = new Set();
        }
        if (umlAssociation["xmi:id"]) {
          classAssocMap[attr.type].add(umlAssociation["xmi:id"]);
        }

        const { lower, upper } = mapMultiplicity(attr);
        const end: UMLAssociationEnd = {
          targetClassId: attr.type,
          roleName: attr.name,
          lowerBound: lower,
          upperBound: upper,
          aggregation: attr.aggregation as UMLAggregationKind | undefined
        };
        return end;
      })
      //filter out any null values (in case of missing or malformed member ends)
      .filter(Boolean) as UMLAssociationEnd[];

      //TODO fehlerhandling einbauen wenn es nicht mindestens 2 Enden gibt
      if (ends.length >= 2) {
        associations.push({
          id: el["xmi:id"],
          type: "uml:Association",
          name: el.name ?? "",
          ends
        });
      }
    }
  });

  return associations;
};

/**
 * Processes all classes, reading their attributes and resolving association IDs from the classAssocMap.
 * @param packagedElements - The array of classes and associations from the parsed XMI JSON.
 * @param classAssocMap - A map containing the pre-calculated relationships between class IDs and their associated association IDs.
 * @returns An array containing the processed UMLClass objects.
 */
const processClasses = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation)[],
  classAssocMap: Record<string, Set<string>>
): UMLClass[] => {
  const classes: UMLClass[] = [];

  packagedElements.forEach(el => {
    if (el["xmi:type"] === "uml:Class") {
      const umlClass = el as XmiJsonClass;
      const allAttributes = ensureArray<XmiJsonOwnedAttribute>(umlClass.ownedAttribute);
      
      // filter out association ends to only keep pure data attributes
      const dataAttributes: UMLAttribute[] = allAttributes
        .filter(attr => !attr.association)
        .map(attr => ({
          id: attr["xmi:id"],
          name: attr.name,
          type: attr.type || "String",
        })) as UMLAttribute[];

      classes.push({
        id: el["xmi:id"],
        type: "uml:Class",
        name: el.name ?? "",
        attributes: dataAttributes,
        associationIds: Array.from(classAssocMap[el["xmi:id"]] || []).filter(Boolean)
      });
    }
  });

  return classes;
};

/**
 * maps the raw XMI JSON data to our internal UML-IR format. It processes the model, classes, attributes, and associations, 
 * ensuring that all elements are correctly linked and multiplicities are handled
 * @param rawData the raw XMI JSON data from the XMI Parser
 * @returns the mapped UML-IR or null if the input data is invalid
 */
export const mapXmiToIR = (rawData: XmiJsonData): UMLIR | null => {
  //TODO hier später logger und error handling einbauen
  if (!rawData || !rawData["uml:Model"]) return null;

  const xmiModel: XmiJsonModel = rawData["uml:Model"];
  const packagedElements = ensureArray<XmiJsonClass | XmiJsonAssociation>(xmiModel.packagedElement);
  
  //first make a lookup table for all elements and attributes, to allow easy cross-referencing when processing associations and classes
  const elementLookup = buildElementLookup(packagedElements);


  const classAssocMap: Record<string, Set<string>> = {};

  //process Associations first to map out all relationships, and fill the classAssocMap withe the association IDs, since they are not saved in an homogenous way
  const associations = processAssociations(packagedElements, elementLookup, classAssocMap);

  //process Classes and assign the pre-calculated associations
  const classes = processClasses(packagedElements, classAssocMap);

  return {
    model: {
      id: xmiModel["xmi:id"] || "model-root",
      type: "uml:Model",
      name: xmiModel.name ?? "",
      packagedElement: [...classes, ...associations]
    }
  };
};