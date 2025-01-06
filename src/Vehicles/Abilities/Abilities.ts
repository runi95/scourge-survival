import { GameMap } from "../../Game/GameMap";
import { GlyphAbility } from "./GlyphAbility";
import { MagicSentry } from "./MagicSentry";
import { ManaLeech } from "./ManaLeech";
import { Runes } from "./Runes";

export class Abilities {
  private readonly gameMap: GameMap;
  private readonly abilities: unknown[] = [];

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public initialize() {
    this.abilities.push(new ManaLeech(this.gameMap));
    this.abilities.push(new Runes());
    this.abilities.push(new MagicSentry(this.gameMap));
    this.abilities.push(new GlyphAbility(this.gameMap));
  }
}
