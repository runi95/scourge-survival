import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A swarm of bats sweeps in from the farthest enemy towards the hero,
// dragging every enemy ground unit it catches along, and drops them in a
// line in front of the hero, where spikes impale the whole line
export class Undertow extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0A6");
  public readonly merchantItemTypeId = FourCC("I0A7");
  public readonly recipe: number[] = [FourCC("I001"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly impaleAbilityId: number = FourCC("A00A");

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
      const { x, y } = vehicle.unit;
      let farthest: Unit | undefined;
      let farthestDistance = 0;
      const grp = Group.fromRange(800, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (distance <= farthestDistance) return;
        farthest = u;
        farthestDistance = distance;
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (farthest == null) return;
      this.sweep(owner, vehicle.unit, farthest.x, farthest.y);
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

  private sweep(owner: MapPlayer, hero: Unit, fromX: number, fromY: number) {
    // It starts a little behind the farthest enemy
    const away = Math.atan2(fromY - hero.y, fromX - hero.x);
    let x = fromX + 100 * Math.cos(away);
    let y = fromY + 100 * Math.sin(away);
    const swarm = Effect.create(
      "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmMissile.mdl",
      x,
      y,
    );
    swarm.setYaw(away + Math.PI);
    swarm.setHeight(40);
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);

    const at = Point.create(x, y);
    const bitten = new Set<number>();
    // Dragged enemies keep their place along the swarm's line
    const dragged: { unit: Unit; behind: number }[] = [];
    let travelled = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      const angle = Math.atan2(hero.y - y, hero.x - x);
      const left = Math.sqrt(
        (hero.x - x) * (hero.x - x) + (hero.y - y) * (hero.y - y),
      );
      const step = Math.min(900 * 0.03, Math.max(0, left - 100));
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      travelled += step;
      swarm.x = x;
      swarm.y = y;
      swarm.setYaw(angle);
      at.setPosition(x, y);

      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (bitten.has(u.id)) return;
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        bitten.add(u.id);
        dummy.damageTarget(
          u.handle,
          90,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (!u.isUnitType(UNIT_TYPE_FLYING) && dragged.length < 8)
          dragged.push({ unit: u, behind: 40 * dragged.length });
      });
      grp.destroy();

      for (const { unit, behind } of dragged) {
        if (!unit.isAlive()) continue;
        unit.x = x - (behind + 60) * Math.cos(angle);
        unit.y = y - (behind + 60) * Math.sin(angle);
      }
      if (step > 0 && travelled < 1200) return;

      // Dropped in a line in front of the hero, where the spikes rise
      TimerUtils.releaseTimer(t);
      swarm.destroy();
      at.destroy();
      const impaler = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      impaler.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      impaler.addAbility(this.impaleAbilityId);
      impaler.issueOrderAt("impale", x, y);
    });
  }
}
