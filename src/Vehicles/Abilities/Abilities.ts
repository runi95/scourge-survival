import { AdeptTraining } from "./AdeptTraining";
import { AntiMagicShell } from "./AntiMagicShell";
import { Blizzard } from "./Blizzard";
import { GlyphAbility } from "./GlyphAbility";
import { MagicSentry } from "./MagicSentry";
import { ManaLeech } from "./ManaLeech";
import { Runes } from "./Runes";
import { HowlOfTerror } from "./HowlOfTerror";
import { UnholyFrenzy } from "./UnholyFrenzy";
import { Overdrive } from "./Overdrive";
import { BansheeShell } from "./BansheeShell";
import { MoonGlaive } from "./MoonGlaive";
import { Wail } from "./Wail";
import { ArtilleryStrike } from "./ArtilleryStrike";
import { Stampede } from "./Stampede";

export class Abilities {
  private readonly abilities: unknown[] = [];

  public initialize() {
    this.abilities.push(new ManaLeech());
    this.abilities.push(new Runes());
    this.abilities.push(new MagicSentry());
    this.abilities.push(new GlyphAbility());
    this.abilities.push(new Blizzard());
    this.abilities.push(new AdeptTraining());
    this.abilities.push(new AntiMagicShell());
    this.abilities.push(new HowlOfTerror());
    this.abilities.push(new UnholyFrenzy());

    // Race hero abilities
    this.abilities.push(new Overdrive());
    this.abilities.push(new ArtilleryStrike());
    this.abilities.push(new BansheeShell());
    this.abilities.push(new MoonGlaive());
    this.abilities.push(new Wail());
    this.abilities.push(new Stampede());
  }
}
