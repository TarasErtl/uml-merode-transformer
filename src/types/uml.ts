/**
 * Defines the overall structure of the mapped UML Internal Representation (IR).
 * This is the target structure for our mapper function.
 */
export interface UMLIR {
  readonly model: UMLModel;
}

/**
 * Represents the root UML Model element in the XMI file.
 */
export interface UMLModel extends UMLElement {
  readonly type: 'uml:Model';
  packagedElement: readonly UMLPackagedElement[];
}

/**
 * A union type for any element that can be directly contained within a model or package.
 */
export type UMLPackagedElement = UMLClass | UMLAssociation; 

/**
 * Represents a UML Class in our mapped, graph-like model.
 */
export interface UMLClass extends UMLElement {
  readonly type: 'uml:Class';
  /** Attributes owned by the class. Does not include association ends. */
  attributes: readonly UMLAttribute[];
  /**
   * Contains the `xmi:id`s of all associations connected to this class.
   * This is a processed field, added for easier traceability.
   */
  associationIds: readonly string[];
}

/**
 * Represents a UML Association between classes in our mapped model.
 */
export interface UMLAssociation extends UMLElement {
  readonly type: 'uml:Association';
  /**
   * An array containing the two ends of the association, with details
   * about the target class, role, and multiplicity.
   */
  ends: readonly [UMLAssociationEnd, UMLAssociationEnd];
}

/**
 * Represents a simple attribute within a UML Class.
 * In this mapped model, it does not represent association ends.
 */
export interface UMLAttribute extends UMLElement {
  readonly visibility?: 'public' | 'private' | 'protected';
  readonly isUnique?: boolean;
  /** The xmi:id or primitive type name of the attribute's type. */
  readonly type: string;
}

/**
 * Describes one end of a UML Association, including its target class,
 * role, and multiplicity. This replaces the need to use UMLProperty for association ends.
 */
export interface UMLAssociationEnd {
  /** The xmi:id of the class at this end of the association. */
  readonly targetClassId: string;
  /** The role name at this end of the association (e.g., 'coordinator'). */
  readonly roleName?: string;
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Represents a generic element within the mapped UML model.
 */
export interface UMLElement {
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
 * '*' represents unlimited.
 */
export const UMLUpperBound = {
  One: "1",
  Unlimited: "*",
} as const;
export type UMLUpperBound = (typeof UMLUpperBound)[keyof typeof UMLUpperBound];