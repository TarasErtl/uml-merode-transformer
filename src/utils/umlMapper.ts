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
 * Helper to ensure a property is always an array.
 */
const ensureArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

/**
 * Maps XMI multiplicity values to our internal types.
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

export const mapXmiToIR = (rawData: XmiJsonData): UMLIR | null => {
  if (!rawData || !rawData["uml:Model"]) return null;

  const xmiModel: XmiJsonModel = rawData["uml:Model"];
  const packagedElements = ensureArray<XmiJsonClass | XmiJsonAssociation>(xmiModel.packagedElement);
  
  // 1. Index all elements by ID for cross-referencing
  const elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> = {};
  packagedElements.forEach(el => {
    elementLookup[el["xmi:id"]] = el;
    if ((el as XmiJsonClass).ownedAttribute) { // Check if it's a class before accessing ownedAttribute
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonClass).ownedAttribute).forEach(attr => {
        elementLookup[attr["xmi:id"]] = attr; // Store raw attribute
        attr._parentClassId = el["xmi:id"]; // Attach parent class ID to attribute for association lookup
      });
    }
    if ((el as XmiJsonAssociation).ownedEnd) { // Check if it's an association before accessing ownedEnd
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonAssociation).ownedEnd).forEach(attr => {
        elementLookup[attr["xmi:id"]] = attr; // Store raw attribute for the association end
      });
    }
  });

  const classes: UMLClass[] = [];
  const associations: UMLAssociation[] = [];

  // 2. Process Packaged Elements
  packagedElements.forEach(el => {
    const type = el["xmi:type"]; // This is safe because XmiJsonBaseElement has xmi:type

    if (type === "uml:Class") {
      const umlClass = el as XmiJsonClass;
      const allAttributes = ensureArray<XmiJsonOwnedAttribute>(umlClass.ownedAttribute);
      
      // Separate data attributes from association-related attributes
      const dataAttributes: UMLAttribute[] = allAttributes
        .filter(attr => !attr.association) // If it has 'association', it's an end //
        .map(attr => ({
          id: attr["xmi:id"], // Map xmi:id from raw data to 'id' in UMLAttribute
          name: attr.name,
          type: attr.type || "String", // Default or lookup
          visibility: attr.visibility,
          isUnique: attr.isUnique === true
        }));

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
    
    else if (type === "uml:Association") { // This is safe because XmiJsonAssociation has xmi:type
      const umlAssociation = el as XmiJsonAssociation;
      const memberEndIds = (typeof umlAssociation.memberEnd === "string" ? umlAssociation.memberEnd : "").split(/\s+/);
      
      // Map ends by looking up the attributes referenced in memberEnd
      const ends = memberEndIds.map(id => {
        const attr = elementLookup[id] as XmiJsonOwnedAttribute; // Cast to XmiJsonOwnedAttribute
        if (!attr || !attr.type) return null; // Ensure attr and attr.type exist for targetClassId

        const { lower, upper } = mapMultiplicity(attr);
        const end: UMLAssociationEnd = {
          targetClassId: attr.type, // In your JSON, type is the class ID
          roleName: attr.name,
          lowerBound: lower,
          upperBound: upper
        };
        return end;
      }).filter(Boolean) as UMLAssociationEnd[];

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