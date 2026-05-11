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
export type UMLPackagedElement = UMLClass | UMLAssociation | UMLAssociationClass; 

/**
 * Represents a UML Class, with its attributes and associations
 */
export interface UMLClass extends UMLBaseElement {
  readonly type: 'uml:Class';
  attributes: readonly UMLAttribute[];
  associationIds: readonly string[];
  readonly isAbstract?: boolean;
}

/**
 * Represents a UML Association, containing the two ends
 */
export interface UMLAssociation extends UMLBaseElement {
  readonly type: 'uml:Association';
  ends: readonly UMLAssociationEnd[];
}

/**
 * Represents a UML Association Class, which is both a Class and an Association.
 */
export interface UMLAssociationClass extends UMLBaseElement {
  readonly type: 'uml:AssociationClass';
  attributes: readonly UMLAttribute[];
  associationIds: readonly string[];
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
 * Possible types of association ends
 */
export type UMLEndType = 'none' | 'shared' | 'composite' | 'generalization';

/**
 * Base interface for common properties of any association end
 */
export interface UMLAssociationEndBase {
  readonly targetClassId: string;
  readonly roleName?: string;
  readonly endType: UMLEndType;
}

/**
 * Represents a normal association end
 */
export interface UMLNormalAssociationEnd extends UMLAssociationEndBase {
  readonly endType: 'none';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Represents an aggregation end
 */
export interface UMLAggregationEnd extends UMLAssociationEndBase {
  readonly endType: 'shared';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Represents a composition end
 */
export interface UMLCompositionEnd extends UMLAssociationEndBase {
  readonly endType: 'composite';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Represents a generalization end (inheritance)
 */
export interface UMLGeneralizationEnd extends UMLAssociationEndBase {
  readonly endType: 'generalization';
  readonly generalizationRole: 'super' | 'sub';
}

/**
 * Describes one end of a UML Relationship.
 */
export type UMLAssociationEnd = UMLNormalAssociationEnd | UMLAggregationEnd | UMLCompositionEnd | UMLGeneralizationEnd;

/**
 * A type representing a non-generalization end of an association.
 */
export type UMLRegularAssociationEnd = Exclude<UMLAssociationEnd, UMLGeneralizationEnd>;

/**
 * Represents a generic element,,every element should have and id and a name
 */
export interface UMLBaseElement {
  readonly id: string;
  readonly name: string;
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