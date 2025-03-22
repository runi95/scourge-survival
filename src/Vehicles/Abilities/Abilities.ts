import { GameMap } from "../../Game/GameMap";
import { AdeptTraining } from "./AdeptTraining";
import { AntiMagicShell } from "./AntiMagicShell";
import { Blizzard } from "./Blizzard";
import { GlyphAbility } from "./GlyphAbility";
import { MagicSentry } from "./MagicSentry";
import { ManaLeech } from "./ManaLeech";
import { PocketFactory } from "./PocketFactory";
import { Runes } from "./Runes";
import { HowlOfTerror } from "./HowlOfTerror";
import { UnholyFrenzy } from "./UnholyFrenzy";

export class Abilities {
  private readonly abilities: unknown[] = [];

  public initialize() {
    this.abilities.push(new ManaLeech());
    this.abilities.push(new Runes());
    this.abilities.push(new MagicSentry());
    this.abilities.push(new GlyphAbility());
    this.abilities.push(new Blizzard());
    this.abilities.push(new PocketFactory());
    this.abilities.push(new AdeptTraining());
    this.abilities.push(new AntiMagicShell());
    this.abilities.push(new HowlOfTerror());
    this.abilities.push(new UnholyFrenzy());
  }
}
