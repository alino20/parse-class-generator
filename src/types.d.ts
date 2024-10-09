export type Primitive =
  | undefined
  | null
  | boolean
  | number
  | symbol
  | string
  | Date;

export type Serializable = Primitive | SerializableObject | SerializableArray;

export type SerializableArray = ReadonlyArray<Serializable>;

export type SerializableObject = Readonly<{ [key: string]: Serializable }>;
