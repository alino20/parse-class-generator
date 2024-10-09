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

export type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

type x = {
  name: string;
  age?: number;
  address?: string;
  job: string;
};

type x2 = RequiredKeys<x>;
