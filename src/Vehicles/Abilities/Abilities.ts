import { GameMap } from "../../Game/GameMap";
import { MagicSentry } from "./MagicSentry";
import { ManaLeech } from "./ManaLeech";
import { Runes } from "./Runes";

export class Abilities {
  private readonly gameMap: GameMap;
  private readonly abilities: unknown[];

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.abilities = [
      new ManaLeech(this.gameMap),
      new Runes(this.gameMap),
      new MagicSentry(this.gameMap),
    ];
  }
}
