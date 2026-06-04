import { 
  type UMLIR, 
  type UMLClass, 
  type UMLAssociation, 
  type UMLAssociationClass,
  type UMLAttribute, 
  type UMLAssociationEnd, 
  type UMLOperation,
  UMLLowerBound, 
  UMLUpperBound,
} from '../types/metamodels/uml';
import {
  type XmiJsonData,
  type XmiJsonModel,
  type XmiJsonClass,
  type XmiJsonAssociation,
  type XmiJsonAssociationClass,
  type XmiJsonOwnedAttribute,
  type XmiJsonGeneralization,
  type XmiJSONOwnedOperation,
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
  packagedElements: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[]
): Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> => {
  const elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute> = {};
  
  //go through all the elements in the xmiJSON Metamodel and store them in the table by the ID
  //also add all of their attributes or ownedEnds
  packagedElements.forEach(el => {
    elementLookup[el["xmi:id"]] = el;

    //class
    if ((el as XmiJsonClass).ownedAttribute) {
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonClass).ownedAttribute).forEach(attr => {
        elementLookup[attr["xmi:id"]] = attr;
        attr._parentClassId = el["xmi:id"]; //adding the ID of the attr parent for faster referencing
      });
    }

    //association
    if ((el as XmiJsonAssociation).ownedEnd) {
      ensureArray<XmiJsonOwnedAttribute>((el as XmiJsonAssociation).ownedEnd).forEach(attr => {
        elementLookup[attr["xmi:id"]] = attr;
      });
    }
  });
  
  return elementLookup;
};

/**
 * Processes all associations, creating the UMLAssociation objects and populating the classAssocMap, for faster access from classes
 * to assiciations later on.
 * @param packagedElements - The array of classes and associations from the parsed XMI JSON.
 * @param elementLookup - A lookup table mapping element IDs to their respective objects.
 * @param classAssocMap - A map that will be populated with class IDs as keys and sets of association IDs as values.
 * @returns An array containing the processed UMLAssociation objects.
 */
const processAssociations = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[],
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

        const targetClassId = typeof attr.type === 'string' 
          ? attr.type 
          : ((attr.type as any)["xmi:id"] || (attr.type as any).href?.split('#').pop() || "unknown");

        // Map the target class to this association
        if (!classAssocMap[targetClassId]) {
          classAssocMap[targetClassId] = new Set();
        }
        if (umlAssociation["xmi:id"]) {
          classAssocMap[targetClassId].add(umlAssociation["xmi:id"]);
        }

        const { lower, upper } = mapMultiplicity(attr);
        
        const endType = attr.aggregation || 'none';
        const baseEnd = {
          targetClassId: targetClassId,
          roleName: attr.name,
          lowerBound: lower,
          upperBound: upper,
        };
        
        let end: UMLAssociationEnd;
        // Map the XMI aggregation value to the new endType discriminated union
        if (endType === 'shared') {
          end = { ...baseEnd, endType: 'shared' };
        } else if (endType === 'composite') {
          end = { ...baseEnd, endType: 'composite' };
        } else {
          end = { ...baseEnd, endType: 'none' };
        }

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
  packagedElements: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[],
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
        .map(attr => {
          let attrType = "String";
          if (typeof attr.type === "string") {
            attrType = attr.type;
          } else if (attr.type && typeof attr.type === "object") {
            if ((attr.type as any).href) {
              attrType = (attr.type as any).href.split('#').pop() || "String";
            } else if ((attr.type as any)["xmi:type"]) {
              attrType = (attr.type as any)["xmi:type"].replace("uml:", "");
            }
          }
          return {
            id: attr["xmi:id"],
            name: attr.name,
            type: attrType,
          };
        }) as UMLAttribute[];

      // Process operations
      const allOperations = ensureArray<XmiJSONOwnedOperation>(umlClass.ownedOperation);
      const operations: UMLOperation[] = allOperations.map(op => ({
        id: op["xmi:id"],
        name: op.name ?? "",
        visibility: op.visibility || 'public'
      }));

      classes.push({
        id: el["xmi:id"],
        type: "uml:Class",
        name: el.name ?? "",
        attributes: dataAttributes,
        operations: operations,
        associationIds: Array.from(classAssocMap[el["xmi:id"]] || []).filter(Boolean),
        isAbstract: umlClass.isAbstract === "true" || umlClass.isAbstract === true
      });
    }
  });

  return classes;
};

/**
 * Processes all classes to extract generalizations, creating UMLAssociation objects 
 * for them and populating the classAssocMap.
 * @param packagedElements - The array of classes and associations from the parsed XMI JSON.
 * @param classAssocMap - A map that will be populated with class IDs as keys and sets of association IDs as values.
 * @returns An array containing the processed UMLAssociation objects representing generalizations.
 */
const processGeneralizations = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[],
  classAssocMap: Record<string, Set<string>>
): UMLAssociation[] => {
  const generalizations: UMLAssociation[] = [];

  packagedElements.forEach(el => {
    if (el["xmi:type"] === "uml:Class") {
      const umlClass = el as XmiJsonClass;
      const allGeneralizations = ensureArray<XmiJsonGeneralization>(umlClass.generalization);

      allGeneralizations.forEach(gen => {
        if (!gen) return;

        const genId = gen["xmi:id"];
        const superclassId = gen.general;
        const subclassId = umlClass["xmi:id"];

        if (!superclassId || !subclassId || !genId) return;

        // Map the superclass and subclass to this generalization
        if (!classAssocMap[superclassId]) {
          classAssocMap[superclassId] = new Set();
        }
        classAssocMap[superclassId].add(genId);

        if (!classAssocMap[subclassId]) {
          classAssocMap[subclassId] = new Set();
        }
        classAssocMap[subclassId].add(genId);

        // A generalization is represented as an association with a specific endType
        generalizations.push({
          id: genId,
          type: "uml:Association",
          name: gen.name ?? "",
          ends: [
            {
              targetClassId: superclassId,
              endType: "generalization",
            } as UMLAssociationEnd,
            {
              targetClassId: subclassId,
              endType: "none",
            } as UMLAssociationEnd
          ]
        });
      });
    }
  });

  return generalizations;
};

/**
 * Processes all association classes, extracting their attributes, association IDs, and ends.
 * @param packagedElements - The array of elements from the parsed XMI JSON.
 * @param elementLookup - A lookup table mapping element IDs to their respective objects.
 * @param classAssocMap - A map containing the pre-calculated relationships between class IDs and their associated association IDs.
 * @returns An array containing the processed UMLAssociationClass objects.
 */
const processAssociationClasses = (
  packagedElements: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[],
  elementLookup: Record<string, XmiJsonBaseElement | XmiJsonOwnedAttribute>,
  classAssocMap: Record<string, Set<string>>
): UMLAssociationClass[] => {
  const associationClasses: UMLAssociationClass[] = [];

  packagedElements.forEach(el => {
    if (el["xmi:type"] === "uml:AssociationClass") {
      const umlAssocClass = el as XmiJsonAssociationClass;
      const classId = umlAssocClass["xmi:id"];

      // 1. Process Attributes
      const allAttributes = ensureArray<XmiJsonOwnedAttribute>(umlAssocClass.ownedAttribute);
      const dataAttributes: UMLAttribute[] = allAttributes
        .filter(attr => !attr.association)
        .map(attr => {
          let attrType = "String";
          if (typeof attr.type === "string") {
            attrType = attr.type;
          } else if (attr.type && typeof attr.type === "object") {
            if ((attr.type as any).href) {
              attrType = (attr.type as any).href.split('#').pop() || "String";
            } else if ((attr.type as any)["xmi:type"]) {
              attrType = (attr.type as any)["xmi:type"].replace("uml:", "");
            }
          }
          return {
            id: attr["xmi:id"],
            name: attr.name,
            type: attrType,
          };
        }) as UMLAttribute[];

      // 2. Process Operations
      const allOperations = ensureArray<XmiJSONOwnedOperation>((umlAssocClass as any).ownedOperation);
      const operations: UMLOperation[] = allOperations.map(op => ({
        id: op["xmi:id"],
        name: op.name ?? "",
        visibility: op.visibility || 'public'
      }));

      // 3. Process Ends
      let memberEndIds: string[] = [];
      if (typeof umlAssocClass.memberEnd === "string") {
        memberEndIds = umlAssocClass.memberEnd.split(/\s+/);
      } else if (Array.isArray(umlAssocClass.memberEnd)) {
        memberEndIds = umlAssocClass.memberEnd;
      }
      memberEndIds = memberEndIds.filter(Boolean);

      const ends = memberEndIds.map(id => {
        const attr = elementLookup[id] as XmiJsonOwnedAttribute;
        if (!attr || !attr.type) return null;

        const targetClassId = typeof attr.type === 'string' 
          ? attr.type 
          : ((attr.type as any)["xmi:id"] || (attr.type as any).href?.split('#').pop() || "unknown");

        // Map the target class to this association
        if (!classAssocMap[targetClassId]) {
          classAssocMap[targetClassId] = new Set();
        }
        if (classId) {
          classAssocMap[targetClassId].add(classId);
        }

        const { lower, upper } = mapMultiplicity(attr);
        
        const endType = attr.aggregation || 'none';
        const baseEnd = {
          targetClassId: targetClassId,
          roleName: attr.name,
          lowerBound: lower,
          upperBound: upper,
        };
        
        let end: UMLAssociationEnd;
        if (endType === 'shared') {
          end = { ...baseEnd, endType: 'shared' };
        } else if (endType === 'composite') {
          end = { ...baseEnd, endType: 'composite' };
        } else {
          end = { ...baseEnd, endType: 'none' };
        }

        return end;
      }).filter(Boolean) as UMLAssociationEnd[];

      associationClasses.push({
        id: classId,
        type: "uml:AssociationClass",
        name: umlAssocClass.name ?? "",
        attributes: dataAttributes,
        operations: operations,
        associationIds: [], 
        ends
      });
    }
  });

  associationClasses.forEach(ac => {
    ac.associationIds = Array.from(classAssocMap[ac.id] || []).filter(Boolean);
  });

  return associationClasses;
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
  const packagedElements = ensureArray<XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass>(xmiModel.packagedElement);
  
  //first make a lookup table for all elements and attributes, to allow easy cross-referencing when processing associations and classes
  const elementLookup = buildElementLookup(packagedElements);

  //Used to make a map for Class -> Assoc, to easier get the Assocs connected to a Class when creating a Class
  const classAssocMap: Record<string, Set<string>> = {};

  //process Associations first to map out all relationships, and fill the classAssocMap withe the association IDs, since they are not saved in an homogenous way
  const associations = processAssociations(packagedElements, elementLookup, classAssocMap);

  //process Generalizations to extract them from classes and map them as associations
  const generalizations = processGeneralizations(packagedElements, classAssocMap);

  //process Association Classes mapping both their attribute properties and ends properties
  const associationClasses = processAssociationClasses(packagedElements, elementLookup, classAssocMap);

  //process Classes and assign the pre-calculated associations
  const classes = processClasses(packagedElements, classAssocMap);

  return {
    model: {
      id: xmiModel["xmi:id"] || "model-root",
      type: "uml:Model",
      name: xmiModel.name ?? "",
      packagedElement: [...classes, ...associations, ...generalizations, ...associationClasses]
    }
  };
};