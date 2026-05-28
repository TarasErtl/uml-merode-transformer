/**
 * Entire parsed XMI JSON structure.
 */
export interface XmiJsonData {
  'uml:Model': XmiJsonModel;
}

/**
 * Root UML model element in the parsed XMI JSON.
 */
export interface XmiJsonModel extends XmiJsonBaseElement {
  'xmi:type': 'uml:Model';
  packagedElement?: (XmiJsonClass | XmiJsonAssociation | XmiJsonAssociationClass)[];
}

/**
 * UML class in the parsed XMI JSON.
 */
export interface XmiJsonClass extends XmiJsonBaseElement {
  'xmi:type': 'uml:Class';
  ownedAttribute?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
  ownedOperation?: XmiJSONOwnedOperation | XmiJSONOwnedOperation[];
  generalization?: XmiJsonGeneralization | XmiJsonGeneralization[];
  isAbstract?: string | boolean;
}

/**
 * UML association in the parsed XMI JSON.
 */
export interface XmiJsonAssociation extends XmiJsonBaseElement {
  'xmi:type': 'uml:Association';
  memberEnd?: string | string[];
  ownedEnd?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
}

/**
 * UML association class in the parsed XMI JSON.
 */
export interface XmiJsonAssociationClass extends XmiJsonBaseElement {
  'xmi:type': 'uml:AssociationClass';
  memberEnd?: string | string[];
  ownedEnd?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
  ownedAttribute?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
  generalization?: XmiJsonGeneralization | XmiJsonGeneralization[];
}

/**
 * Generalization relationship in the parsed XMI JSON.
 */
export interface XmiJsonGeneralization extends XmiJsonBaseElement {
  general: string;
}

/**
 * Owned attribute of a class in the parsed XMI JSON.
 */
export interface XmiJsonOwnedAttribute extends XmiJsonBaseElement {
  type?: string;
  visibility?: 'public' | 'private' | 'protected';
  isUnique?: boolean;
  association?: string;
  aggregation?: 'none' | 'shared' | 'composite';
  lowerValue?: XmiJsonMultiplicityValue;
  upperValue?: XmiJsonMultiplicityValue;
  _parentClassId?: string; // Internal property to link back to the parent class ID for association mapping.
}

/**
 * Owned operation of a class in the parsed XMI JSON.
 */
export interface XmiJSONOwnedOperation extends XmiJsonBaseElement {
  visibility?: 'public' | 'private' | 'protected';
}

/**
 * Multiplicity value inside an attribute or association end.
 */
export interface XmiJsonMultiplicityValue {
  value?: string;
}

/**
 * Generic XMI element returned by the XML parser.
 */
export interface XmiJsonBaseElement {
  'xmi:id': string;
  name?: string;
  'xmi:type'?: string;
}