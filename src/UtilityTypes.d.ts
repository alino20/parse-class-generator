export type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K;
}[keyof T];

type OptionalKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? K : never;
}[keyof T];

type PickRequiredl<T> = Pick<T, RequiredKeys<T>>;
type PickOptional<T> = Pick<T, OptionalKeys<T>>;
