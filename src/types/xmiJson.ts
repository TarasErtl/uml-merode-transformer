/**
 * Represents the entire parsed XMI JSON structure.
 */
export interface XmiJsonData {
  'uml:Model': XmiJsonModel;
}

export interface XmiJsonModel extends XmiJsonBaseElement {
  'xmi:type': 'uml:Model';
  packagedElement?: (XmiJsonClass | XmiJsonAssociation)[];
}

export interface XmiJsonClass extends XmiJsonBaseElement {
  'xmi:type': 'uml:Class';
  ownedAttribute?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
}

export interface XmiJsonAssociation extends XmiJsonBaseElement {
  'xmi:type': 'uml:Association';
  memberEnd?: string | string[];
  ownedEnd?: XmiJsonOwnedAttribute | XmiJsonOwnedAttribute[];
}

/**
 * Represents an owned attribute of a class in the parsed XMI JSON.
 */
export interface XmiJsonOwnedAttribute extends XmiJsonBaseElement {
  type?: string;
  visibility?: 'public' | 'private' | 'protected';
  isUnique?: boolean;
  association?: string;
  lowerValue?: XmiJsonMultiplicityValue;
  upperValue?: XmiJsonMultiplicityValue;
  _parentClassId?: string; // Internally added during mapping
}

/**
 * Represents a multiplicity value inside an attribute or association end.
 */
export interface XmiJsonMultiplicityValue {
  value?: string;
}

/**
 * Represents the JSON structure returned by the XML parser for a generic XMI element.
 */
export interface XmiJsonBaseElement {
  'xmi:id': string;
  name?: string;
  'xmi:type'?: string;
}