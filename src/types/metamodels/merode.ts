/**
 * Top container of the Merode model.
 */
export interface MerodeIR {
  readonly model: MerodeModel;
}

/**
 * Root Merode element.
 * Contains all elements (classes and associations).
 */
export interface MerodeModel extends MerodeBaseElement {
  readonly type: 'merode:Model';
  elements: readonly MerodeModelElement[];
}

/**
 * Generic base Merode element interface.
 * Every element should have an ID and an optional name.
 */
export interface MerodeBaseElement {
  readonly id: string;
  readonly name?: string;
}

/**
 * Union type for classes and associations.
 */
export type MerodeModelElement = MerodeClass | MerodeAssociation

/**
 * Merode class.
 */
export interface MerodeClass extends MerodeBaseElement {
  readonly type: 'merode:Class';
  attributes: readonly MerodeAttribute[];
  operations: readonly MerodeOperation[];
  associationIds: readonly string[];
}

/**
 * Merode attribute.
 */
export interface MerodeAttribute extends MerodeBaseElement {
  readonly type: 'merode:Attribute';
}

/**
 * Merode operation.
 */
export interface MerodeOperation extends MerodeBaseElement {
  readonly type?: 'merode:Operation';
  readonly visibility?: 'public' | 'private' | 'protected';
}

/**
 * Merode association.
 * Contains master and dependent class, role name, and multiplicity.
 * Optionally includes flags to mark if the association represents a generalization.
 */
export interface MerodeAssociation extends MerodeBaseElement {
  readonly type: 'merode:Association';
  masterClassId: string;
  multiplicity: MerodeMultiplicity;
  dependentClassId: string;
  roleName?: string;
  readonly isGeneralization?: boolean;
  readonly isAbstract?: boolean;
}

/**
 * Multiplicity values for a Merode dependent class.
 */
export const MerodeMultiplicity = {
  ZeroToMany: "0..*",
  OneToMany: "1..*",
  ZeroToOne: "0..1",
  OneToOne: "1..1"
} as const;
export type MerodeMultiplicity = (typeof MerodeMultiplicity)[keyof typeof MerodeMultiplicity];
