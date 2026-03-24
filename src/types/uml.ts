/**
 * the root interface for the UML Model
 */
export interface UMLIR {
  readonly model: UMLModel;
}

/**
 * the root UML Model element in the XMI file. Contains all the classes and associations
 */
export interface UMLModel extends UMLBaseElement {
  readonly type: 'uml:Model';
  packagedElement: readonly UMLPackagedElement[];
}

/**
 * A union type for Classes and Associations
 */
export type UMLPackagedElement = UMLClass | UMLAssociation; 

/**
 * Represents a UML Class, with its attributes and associations
 */
export interface UMLClass extends UMLBaseElement {
  readonly type: 'uml:Class';
  attributes: readonly UMLAttribute[];
  associationIds: readonly string[];
}

/**
 * Represents a UML Association, containing the two ends
 */
export interface UMLAssociation extends UMLBaseElement {
  readonly type: 'uml:Association';
  ends: readonly UMLAssociationEnd[];
}

/**
 * Represents a simple attribute within a UML Class.
 * its visibiliy, and the type of the value of the attribute
 */
export interface UMLAttribute extends UMLBaseElement {
  readonly type: string;
}

/**
 * Describes one end of a UML Association, including its target class,
 * role, multiplicity, and optionally the aggregation kind.
 */
export interface UMLAssociationEnd {
  readonly targetClassId: string;
  readonly roleName?: string;
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
  readonly aggregation?: UMLAggregationKind;
}

/**
 * Represents a generic element,,every element should have and id and a name
 */
export interface UMLBaseElement {
  readonly id: string;
  readonly name?: string;
}

/**
 * Values for the lower bound of a UML multiplicity.
 */
export const UMLLowerBound = {
  Zero: "0",
  One: "1",
} as const;
export type UMLLowerBound = (typeof UMLLowerBound)[keyof typeof UMLLowerBound];

/**
 * Values for the upper bound of a UML multiplicity.
 */
export const UMLUpperBound = {
  One: "1",
  Unlimited: "*",
} as const;
export type UMLUpperBound = (typeof UMLUpperBound)[keyof typeof UMLUpperBound];

/**
 * Values for the aggregation kind of a UML association end.
 */
export const UMLAggregationKind = {
  None: "none",
  Shared: "shared",
  Composite: "composite",
} as const;
export type UMLAggregationKind = (typeof UMLAggregationKind)[keyof typeof UMLAggregationKind];