import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// The hero burns every enemy close to it. An enemy ground unit that stays in
// the flames for 2 seconds is gripped by burning vines: held in place and
// unable to attack for 3 seconds while it burns harder. Once it breaks free it
// has to stay in the flames 2 more seconds to be gripped again
export class GraspingFlames extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I0CK");
  public readonly merchantItemTypeId = FourCC("I0CL");
  public readonly recipe: number[] = [FourCC("I005"), FourCC("I05P")];

  private readonly timers = new Map<number, Timer>();
  private readonly flames = new Map<number, Effect>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly gripAbilityId: number = FourCC("A04M");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.flames.set(
      itemId,
      Effect.createAttachment(
        "Abilities/Spells/NightElf/Immolation/ImmolationTarget.mdl",
        vehicle.unit,
        "origin",
      ),
    );

    // Seconds each enemy has stayed in the flames; a gripped enemy counts up
    // from -3, so it is held 3 seconds and then needs 2 more
    let exposure = new Map<number, number>();
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const next = new Map<number, number>();
      const grp = Group.fromRange(220, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        Effect.createAttachment(
          "Abilities/Spells/NightElf/Immolation/ImmolationDamage.mdl",
          u,
          "head",
        ).destroy();
        hero.damageTarget(
          u.handle,
          20,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (!u.isAlive()) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const seconds = (exposure.get(u.id) ?? 0) + 1;
        if (seconds < 2) {
          next.set(u.id, seconds);
          return;
        }
        next.set(u.id, -3);
        this.grip(owner, u);
      });
      grp.destroy();
      exposure = next;
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

    this.flames.get(itemId)?.destroy();
    this.flames.delete(itemId);
  }

  // Burning vines hold the enemy for 3 seconds (A04M: 40 per second)
  private grip(owner: MapPlayer, target: Unit): void {
    const dummy = Unit.create(owner, this.dummyUnitId, target.x, target.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    dummy.addAbility(this.gripAbilityId);
    dummy.issueTargetOrder("entanglingroots", target);

    const fire = Effect.createAttachment(
      "Abilities/Spells/Other/ImmolationRed/ImmolationRedTarget.mdl",
      target,
      "origin",
    );
    const later: Timer = TimerUtils.newTimer();
    later.start(3, false, () => {
      TimerUtils.releaseTimer(later);
      fire.destroy();
    });
  }
}
