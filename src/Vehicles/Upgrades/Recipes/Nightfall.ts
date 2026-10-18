import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A great swarm of bats spirals out from the hero for 5 seconds, sweeping
// round it lap after lap until it has darkened everything up to 550 away
export class Nightfall extends WeaponUpgradeRecipe {
  public readonly cooldown = 8;
  public readonly itemTypeId = FourCC("I0A2");
  public readonly merchantItemTypeId = FourCC("I0A3");
  public readonly recipe: number[] = [FourCC("I05L"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");

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
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.spiral(owner, vehicle.unit);
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

  private spiral(owner: MapPlayer, hero: Unit): void {
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 6);
    const swarms: Effect[] = [];
    for (let i = 0; i < 4; i++) {
      const swarm = Effect.create(
        "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmMissile.mdl",
        hero.x,
        hero.y,
      );
      swarm.setHeight(80);
      swarms.push(swarm);
    }
    const at = Point.create(0, 0);
    // Enemy handle id -> when it can be bitten again
    const bitten = new Map<number, number>();
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      elapsed += 0.03;
      const radius = 150 + 400 * (elapsed / 5);
      // A lap every 1.2 seconds
      const turn = (elapsed / 1.2) * 2 * Math.PI;
      for (let i = 0; i < swarms.length; i++) {
        const angle = turn + (i * Math.PI) / 2;
        const x = hero.x + radius * Math.cos(angle);
        const y = hero.y + radius * Math.sin(angle);
        swarms[i].x = x;
        swarms[i].y = y;
        swarms[i].setYaw(angle + Math.PI / 2);
        at.setPosition(x, y);

        const grp = Group.fromRange(125, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if ((bitten.get(u.id) ?? 0) > elapsed) return;

          bitten.set(u.id, elapsed + 0.6);
          dummy.damageTarget(
            u.handle,
            50,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        });
        grp.destroy();
      }
      if (elapsed < 5) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
      for (const swarm of swarms) swarm.destroy();
    });
  }
}
