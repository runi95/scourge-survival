import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 2.5 seconds a thunder clap (A03Z: 60, slowed 3 s) around the hero when
// an enemy ground unit is within 300, leaving a block of ice where the hero
// stood. 2 seconds later the ice shatters: 100 to every enemy within 300, and
// every one of them still slowed by a clap (BHtc) is frozen for 1.5 s
export class FrozenEcho extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I06Q");
  public readonly merchantItemTypeId = FourCC("I06R");
  public readonly recipe: number[] = [FourCC("I05E"), FourCC("I05C")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly clapAbilityId: number = FourCC("A03Z");
  private readonly clapBuffId: number = FourCC("BHtc");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let found = false;
      const grp = Group.fromRange(300, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        found = true;
      });
      grp.destroy();
      if (!found) return;

      const { x, y } = hero;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.clapAbilityId);
      dummy.issueImmediateOrder("thunderclap");
      this.echo(hero, owner, x, y);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }

  private echo(hero: Unit, owner: MapPlayer, x: number, y: number) {
    const ice = Effect.create(
      "Abilities/Spells/Undead/FreezingBreath/FreezingBreathTargetArt.mdl",
      x,
      y,
    );
    ice.scale = 1.6;

    const t = TimerUtils.newTimer();
    t.start(2, false, () => {
      TimerUtils.releaseTimer(t);
      ice.destroy();
      Effect.create(
        "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
        x,
        y,
      ).destroy();
      Effect.create(
        "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
        x,
        y,
      ).destroy();

      const at = Point.create(x, y);
      const grp = Group.fromRange(300, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const slowed = u.getAbilityLevel(this.clapBuffId) > 0;
        hero.damageTarget(
          u.handle,
          100,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (slowed && u.isAlive()) {
          StunUtils.freezeUnit(u, 1.5, false, false, false, false);
        }
      });
      grp.destroy();
      at.destroy();
    });
  }
}
