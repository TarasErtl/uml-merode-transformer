import { 
  type UMLIR, 
  type UMLClass, 
  type UMLAssociation, 
  type UMLAttribute, 
  type UMLAssociationEnd, 
  UMLLowerBound, 
  UMLUpperBound,
} from '../types/uml';
import {
  type XmiJsonData,
  type XmiJsonModel,
  type XmiJsonClass,
  type XmiJsonAssociation,
  type XmiJsonOwnedAttribute,
  type XmiJsonBaseElement
} from '../types/xmiJson';

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
 * maps the raw XMI JSON data to our internal UML-IR format. It processes the model, classes, attributes, and associations, 
 * ensuring that all elements are correctly linked and multiplicities are handled
 * @param rawData the raw XMI JSON data from the XMI Parser
 * @returns the mapped UML-IR or null if the input data is invalid
 */
export const mapXmiToIR = (rawData: XmiJsonData): UMLIR | null => {
  //TODO hier später logger und error handling einbauen
  if (!rawData || !rawData["uml:Model"]) return null;

  //get all classes and associations into one array
  const xmiModel: XmiJsonModel = rawData["uml:Model"];
  const packagedElements = ensureArray<XmiJsonClass | XmiJsonAssociation>(xmiModel.packagedElement);
  
  //1. Index all elements by ID for cross-referencing, making one big lookup table for all relevant elements
  const elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> = {};
  packagedElements.forEach(el => {

    //add each class and association to the lookup table
    elementLookup[el["xmi:id"]] = el;

    //if a class, then also add all the attributes
    if ((el as XmiJsonClass).ownedAttribute) {
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonClass).ownedAttribute).forEach(attr => {
        //store the attribute, and add the parent class ID to the attri
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

  const classes: UMLClass[] = [];
  const associations: UMLAssociation[] = [];

  // 2. Process Packaged Elements
  packagedElements.forEach(el => {
    const type = el["xmi:type"];

    if (type === "uml:Class") {
      const umlClass = el as XmiJsonClass;
      const allAttributes = ensureArray<XmiJsonOwnedAttribute>(umlClass.ownedAttribute);
      
      //filter the data attributes
      const dataAttributes: UMLAttribute[] = allAttributes
        //if an attribute has an association, then it is not a data attribute, but an association end
        .filter(attr => !attr.association)
        .map(attr => ({
          id: attr["xmi:id"],
          name: attr.name,
          type: attr.type || "String",
        }));

      //filter the association ends attributes
      const assocIds = allAttributes
        .filter(attr => attr.association)
        .map(attr => attr.association as string);

      classes.push({
        id: el["xmi:id"],
        type: "uml:Class",
        name: el.name,
        attributes: dataAttributes,
        associationIds: Array.from(new Set(assocIds))
      });
    } 
    
    else if (type === "uml:Association") {
      const umlAssociation = el as XmiJsonAssociation;
      const memberEndIds = (typeof umlAssociation.memberEnd === "string" ? umlAssociation.memberEnd : "").split(/\s+/);
      
      //looking up the member ends in the lookup talbe
      const ends = memberEndIds.map(id => {
        const attr = elementLookup[id] as XmiJsonOwnedAttribute;
        if (!attr || !attr.type) return null;

        const { lower, upper } = mapMultiplicity(attr);
        const end: UMLAssociationEnd = {
          //in the case of an association end, the type of the attribute is the target class ID
          targetClassId: attr.type,
          roleName: attr.name,
          lowerBound: lower,
          upperBound: upper
        };
        return end;
      })
      //filter out any null values (in case of missing or malformed member ends)
      .filter(Boolean) as UMLAssociationEnd[];

      //TODO fehlerhandling einbauen wenn es nicht genau 2 Enden gibt
      if (ends.length === 2) {
        associations.push({
          id: el["xmi:id"],
          type: "uml:Association",
          name: el.name,
          ends: [ends[0], ends[1]]
        });
      }
    }
  });

  return {
    model: {
      id: xmiModel["xmi:id"] || "model-root",
      type: "uml:Model",
      name: xmiModel.name,
      packagedElement: [...classes, ...associations]
    }
  };
};