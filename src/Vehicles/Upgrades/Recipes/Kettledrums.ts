import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Drum {
  unit: Unit;
  // Seconds until it can boom again (the first time: until it is armed)
  rest: number;
  beats: number;
}

interface Band {
  drums: Drum[];
  timers: Timer[];
}

// Every 3.5 seconds a drum (n017, 30 s) under the hero. Armed 2 s later, it
// booms when an enemy ground unit is within 220, at most every 1.5 s: beat n
// (0 - 3) does 10 + 10n to every enemy ground unit within 200 + 25n and slows
// it by 50% for 3 s (A05L); the fifth beat does 60 within 300 and the drum
// is gone
export class Kettledrums extends WeaponUpgradeRecipe {
  public readonly cooldown = 3.5;
  public readonly itemTypeId = FourCC("I07E");
  public readonly merchantItemTypeId = FourCC("I07F");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05C")];

  private readonly bands = new Map<number, Band>();
  private readonly drumUnitId: number = FourCC("n017");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly slowAbilityId: number = FourCC("A05L");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const band: Band = { drums: [], timers: [] };
    this.bands.set(itemId, band);

    const lay = TimerUtils.newTimer();
    lay.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const unit = Unit.create(owner, this.drumUnitId, hero.x, hero.y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      band.drums.push({ unit, rest: 2, beats: 0 });
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.25, true, () => {
      const hero = vehicle.unit;
      for (let i = band.drums.length - 1; i >= 0; i--) {
        const drum = band.drums[i];
        if (!drum.unit.isAlive()) {
          band.drums.splice(i, 1);
          continue;
        }
        drum.rest -= 0.25;
        if (drum.rest > 0) continue;
        if (!this.stepped(drum.unit, owner)) continue;

        drum.rest = 1.5;
        if (drum.beats < 4) {
          this.boom(
            hero,
            owner,
            drum.unit,
            10 + 10 * drum.beats,
            200 + 25 * drum.beats,
          );
          drum.beats++;
          continue;
        }
        band.drums.splice(i, 1);
        this.boom(hero, owner, drum.unit, 60, 300);
        Effect.create(
          "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
          drum.unit.x,
          drum.unit.y,
        ).destroy();
        drum.unit.kill();
      }
    });
    band.timers.push(lay, watch);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const band = this.bands.get(itemId);
    this.bands.delete(itemId);
    if (band == null) return;
    for (const t of band.timers) TimerUtils.releaseTimer(t);
    for (const drum of band.drums) {
      if (drum.unit.isAlive()) drum.unit.kill();
    }
    band.drums.length = 0;
  }

  private stepped(drum: Unit, owner: MapPlayer): boolean {
    let found = false;
    const at = Point.create(drum.x, drum.y);
    const grp = Group.fromRange(220, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      found = true;
    });
    grp.destroy();
    at.destroy();
    return found;
  }

  private boom(
    hero: Unit,
    owner: MapPlayer,
    drum: Unit,
    damage: number,
    radius: number,
  ) {
    const clap = Effect.create(
      "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
      drum.x,
      drum.y,
    );
    clap.scale = radius / 250;
    clap.destroy();
    const at = Point.create(drum.x, drum.y);
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      hero.damageTarget(
        u.handle,
        damage,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) return;
      const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.slowAbilityId);
      dummy.issueTargetOrder("slow", u);
    });
    grp.destroy();
    at.destroy();
  }
}
