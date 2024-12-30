import { MapPlayer } from "w3ts";

export class GameOptions {
  public readonly isDebugModeEnabled: boolean =
    "Local Player" === MapPlayer.fromIndex(0).name;
}
