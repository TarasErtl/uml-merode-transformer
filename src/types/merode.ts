/**
 * the root interface for the MERODE Model
 */
export interface MerodeIR {
  readonly model: MerodeModel;
}

/**
 * the root MERODE Model Element.Contains all the classes and associations
 */
export interface MerodeModel extends MerodeBaseElement {
  readonly type: 'merode:Model';
  elements: readonly MerodeModelElement[];
}

/**
 * Represents a generic element,,every element should have and id and a name
 */
export interface MerodeBaseElement {
  readonly id: string;
  readonly name?: string;
}

/**
 * A union type for Classes and Associations
 */
export type MerodeModelElement = MerodeClass | MerodeAssociation;

/**
 * Represents a MERODE Class, with its attributes and associations
 */
export interface MerodeClass extends MerodeBaseElement {
  readonly type: 'merode:Class';
  attributes: readonly MerodeAttribute[];
  associationIds: readonly string[];
}

/**
 * Represents a MERODE attribute,
 * //TODO später visibility und isUnique wegtun
 */
export interface MerodeAttribute extends MerodeBaseElement {
  readonly type: 'merode:Attribute';
}

/**
 * Represents a MERODE Association, containing the two classes
 * the role name, and the multiplicity of the dependent class
 */
export interface MerodeAssociation extends MerodeBaseElement {
  readonly type: 'merode:Association';
  masterClassId: string;
  multiplicity: MerodeMultiplicity;
  dependentClassId: string;
  roleName?: string;
}

/**
 * Values for the multiplicity of a MERODE dependend class.
 */
export const MerodeMultiplicity = {
  ZeroToMany: "0..*",
  OneToMany: "1..*",
  ZeroToOne: "0..1",
  OneToOne: "1..1"
} as const;
export type MerodeMultiplicity = (typeof MerodeMultiplicity)[keyof typeof MerodeMultiplicity];
