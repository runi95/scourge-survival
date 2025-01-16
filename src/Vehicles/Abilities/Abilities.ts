import { GameMap } from "../../Game/GameMap";
import { AdeptTraining } from "./AdeptTraining";
import { Blizzard } from "./Blizzard";
import { GlyphAbility } from "./GlyphAbility";
import { MagicSentry } from "./MagicSentry";
import { ManaLeech } from "./ManaLeech";
import { PocketFactory } from "./PocketFactory";
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
    this.abilities.push(new Blizzard());
    this.abilities.push(new PocketFactory(this.gameMap));
    this.abilities.push(new AdeptTraining(this.gameMap));
  }
}
