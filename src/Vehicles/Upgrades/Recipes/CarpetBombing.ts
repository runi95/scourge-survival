import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Bomber {
  unit: Unit;
  lastBombX: number;
  lastBombY: number;
}

export class CarpetBombing extends WeaponUpgradeRecipe {
  public readonly cooldown = 14;
  public readonly itemTypeId = FourCC("I02X");
  public readonly merchantItemTypeId = FourCC("I02Y");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly flyingMachineUnitTypeId: number = FourCC("h000");
  private readonly bombUnitTypeId: number = FourCC("u00Z");

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

      const { x, y } = vehicle.unit;
      const target = this.randomEnemy(vehicle.unit, owner);
      const angle =
        target != null
          ? Math.atan2(target.y - y, target.x - x)
          : RandomNumberGenerator.random(0, 359) * MULT;
      this.flyOver(vehicle.unit, owner, angle);
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

  private flyOver(hero: Unit, owner: MapPlayer, angle: number): void {
    const { x, y } = hero;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const bombers: Bomber[] = [];
    for (let i = -1; i <= 1; i++) {
      const offsetX = -sin * i * 175;
      const offsetY = cos * i * 175;
      const startX = x - 400 * cos + offsetX;
      const startY = y - 400 * sin + offsetY;
      const flyingMachine = Unit.create(
        owner,
        this.flyingMachineUnitTypeId,
        startX,
        startY,
        angle / bj_DEGTORAD,
      );
      flyingMachine.issueOrderAt(
        "move",
        x + 1000 * cos + offsetX,
        y + 1000 * sin + offsetY,
      );
      bombers.push({
        unit: flyingMachine,
        lastBombX: startX,
        lastBombY: startY,
      });
    }

    const endX = x + 850 * cos;
    const endY = y + 850 * sin;
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      elapsed += 0.1;
      for (const bomber of bombers) {
        const { x: bx, y: by } = bomber.unit;
        const traveled = Math.sqrt(
          Math.pow(bx - bomber.lastBombX, 2) +
            Math.pow(by - bomber.lastBombY, 2),
        );
        if (traveled < 100) continue;

        bomber.lastBombX = bx;
        bomber.lastBombY = by;
        const bomb = Unit.create(owner, this.bombUnitTypeId, bx, by);
        bomb.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 0.5);
      }

      const leader = bombers[1].unit;
      const remaining = Math.sqrt(
        Math.pow(leader.x - endX, 2) + Math.pow(leader.y - endY, 2),
      );
      if (remaining > 50 && elapsed < 6) return;

      TimerUtils.releaseTimer(t);
      for (const bomber of bombers) {
        bomber.unit.destroy();
      }
    });
  }

  private randomEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(750, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();

    if (enemies.length === 0) return undefined;
    return enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
  }
}
