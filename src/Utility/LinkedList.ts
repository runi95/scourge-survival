import { Node } from "./Node";

export class LinkedList<T> {
  private head: Node<T> | undefined;
  private size: number;

  constructor(values?: T[]) {
    this.head = undefined;
    this.size = 0;

    if (values) {
      values.forEach((v) => this.add(v));
    }
  }

  public isEmpty(): boolean {
    return this.head === undefined;
  }

  public add(value: T): void {
    if (this.isEmpty()) {
      this.head = { value };
      this.size = 1;
    } else {
      this.head = { value, next: this.head as Node<T> };
      this.head.next.previous = this.head;
      this.size++;
    }
  }

  public pop(): Node<T> | undefined {
    if (this.isEmpty()) {
      this.size = 0;
      return undefined;
    }

    const temp: Node<T> = this.head as Node<T>;
    this.head = (this.head as Node<T>).next;
    this.head.previous = undefined;
    temp.next = undefined;

    this.size--;
    return temp;
  }

  public getSize(): number {
    return this.size;
  }

  public removeItem(item: T): Node<T> {
    let node = this.head;
    if (node.value === item) {
      return this.pop();
    }

    while (node != null && node.value !== item) {
      node = node.next;
    }

    if (node.next != null) {
      node.next.previous = node.previous;
    }

    if (node.previous != null) {
      node.previous.next = node.next;
    }

    return node;
  }

  public getFirst(): Node<T> | undefined {
    return this.head;
  }
}
