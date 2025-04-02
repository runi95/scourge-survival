export interface Node<T> {
  value: T;
  previous?: Node<T>;
  next?: Node<T>;
}
