/**
 * the root interface for the Merode Model
 */
export interface MerodeIR {
  readonly model: MerodeModel;
}

/**
 * the root Merode Model element, named "Model", containing all the other elements (classes and associations)
 */
export interface MerodeModel extends MerodeBaseElement {
  readonly type: 'merode:Model';
  elements: readonly MerodeModelElement[];
}

/**
 * Represents a generic element in an Merode Model, every element should have and id and a name
 */
export interface MerodeBaseElement {
  readonly id: string;
  readonly name?: string;
}

/**
 * A union type for Classes and Associations
 */
export type MerodeModelElement = MerodeClass | MerodeAssociation

/**
 * Represents a Merode Class, with its attributes and associationIds
 */
export interface MerodeClass extends MerodeBaseElement {
  readonly type: 'merode:Class';
  attributes: readonly MerodeAttribute[];
  operations: readonly MerodeOperation[];
  associationIds: readonly string[];
}

/**
 * Represents a Merode attribute
 */
export interface MerodeAttribute extends MerodeBaseElement {
  readonly type: 'merode:Attribute';
}

/**
 * Represents a Merode operation
 */
export interface MerodeOperation extends MerodeBaseElement {
  readonly type?: 'merode:Operation';
  readonly visibility?: 'public' | 'private' | 'protected';
}

/**
 * Represents a Merode Association, containing master and dependent class
 * the role name, and the multiplicity of the dependent class.
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
 * Values for the multiplicity of a Merode dependend class.
 */
export const MerodeMultiplicity = {
  ZeroToMany: "0..*",
  OneToMany: "1..*",
  ZeroToOne: "0..1",
  OneToOne: "1..1"
} as const;
export type MerodeMultiplicity = (typeof MerodeMultiplicity)[keyof typeof MerodeMultiplicity];
