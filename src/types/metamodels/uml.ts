/**
 * top container of the Model
 */
export interface UMLIR {
  readonly model: UMLModel;
}

/**
 * root UML Element
 * contains all Classes, Associations and AssociationClasses
 */
export interface UMLModel extends UMLBaseElement {
  readonly type: 'uml:Model';
  packagedElement: readonly UMLPackagedElement[];
}

/**
 * Union Type for Classes, Associations and AssociationClasses
 */
export type UMLPackagedElement = UMLClass | UMLAssociation | UMLAssociationClass; 

/**
 * UML Class
 */
export interface UMLClass extends UMLBaseElement {
  readonly type: 'uml:Class';
  attributes: readonly UMLAttribute[];
  operations: readonly UMLOperation[];
  associationIds: readonly string[];
  readonly isAbstract?: boolean;
}

/**
 * UML Association
 */
export interface UMLAssociation extends UMLBaseElement {
  readonly type: 'uml:Association';
  ends: readonly UMLAssociationEnd[];
}

/**
 * UML AssociationClass
 */
export interface UMLAssociationClass extends UMLBaseElement {
  readonly type: 'uml:AssociationClass';
  attributes: readonly UMLAttribute[];
  operations: readonly UMLOperation[];
  associationIds: readonly string[];
  ends: readonly UMLAssociationEnd[];
}

/**
 * UML Attribute
 */
export interface UMLAttribute extends UMLBaseElement {
  readonly type: string;
}

/**
 * UML Operation
 */
export interface UMLOperation extends UMLBaseElement {
  readonly visibility: 'public' | 'private' | 'protected';
}

/**
 * AssiciationEnd types
 */
export type UMLEndType = 'none' | 'shared' | 'composite' | 'generalization';

/**
 * AssociationEnd basic properties
 */
export interface UMLAssociationEndBase {
  readonly targetClassId: string;
  readonly roleName?: string;
  readonly endType: UMLEndType;
}

/**
 * Regular AssociationEnd
 */
export interface UMLNormalAssociationEnd extends UMLAssociationEndBase {
  readonly endType: 'none';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Aggregation AssociationEnd
 */
export interface UMLAggregationEnd extends UMLAssociationEndBase {
  readonly endType: 'shared';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Composition AssociationEnd
 */
export interface UMLCompositionEnd extends UMLAssociationEndBase {
  readonly endType: 'composite';
  readonly lowerBound: UMLLowerBound;
  readonly upperBound: UMLUpperBound;
}

/**
 * Generalisation AssociationEnd
 */
export interface UMLGeneralizationEnd extends UMLAssociationEndBase {
  readonly endType: 'generalization';
  readonly generalizationRole: 'super' | 'sub';
}

/**
 * Union Type for AssociationEnds
 */
export type UMLAssociationEnd = UMLNormalAssociationEnd | UMLAggregationEnd | UMLCompositionEnd | UMLGeneralizationEnd;

/**
 * Union Type for AssociationEnds without generalization
 */
export type UMLRegularAssociationEnd = Exclude<UMLAssociationEnd, UMLGeneralizationEnd>;

/**
 * Generic Base UML Element interface
 */
export interface UMLBaseElement {
  readonly id: string;
  readonly name: string;
}

/**
 * UML Multiplicity: lowerBound
 */
export const UMLLowerBound = {
  Zero: "0",
  One: "1",
} as const;
export type UMLLowerBound = (typeof UMLLowerBound)[keyof typeof UMLLowerBound];

/**
 * UML Multiplicity: upperBound
 */
export const UMLUpperBound = {
  One: "1",
  Unlimited: "*",
} as const;
export type UMLUpperBound = (typeof UMLUpperBound)[keyof typeof UMLUpperBound];