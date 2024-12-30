import { DamageInstance } from "./DamageEngine";

export interface DamageEvent {
  event(globals: DamageInstance): void;
}
