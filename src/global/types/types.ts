export type Properties<T> = {
  [Key in keyof T]: T[Key];
};
