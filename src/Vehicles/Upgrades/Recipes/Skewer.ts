import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// A lance of shadow and bone flies down the line with the most enemies in it,
// skewering and stunning each of them, and hits harder for every enemy it
// has already gone through
export class Skewer extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0BS");
  public readonly merchantItemTypeId = FourCC("I0BT");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I001")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly length = 900;
  private readonly width = 100;

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

      const angle = this.bestLine(vehicle.unit, owner);
      if (angle != null)
        this.throw(owner, vehicle.unit.x, vehicle.unit.y, angle);
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

  private throw(owner: MapPlayer, fromX: number, fromY: number, angle: number) {
    const lance = Effect.create(
      "Abilities/Weapons/CryptFiendMissile/CryptFiendMissile.mdl",
      fromX,
      fromY,
    );
    lance.scale = 1.6;
    lance.setColor(120, 90, 160);
    lance.setYaw(angle);
    lance.setHeight(60);
    const dummy = Unit.create(owner, this.dummyUnitId, fromX, fromY);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);

    const at = Point.create(fromX, fromY);
    const skewered = new Set<number>();
    let travelled = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03, true, () => {
      travelled += 1400 * 0.03;
      const x = fromX + travelled * Math.cos(angle);
      const y = fromY + travelled * Math.sin(angle);
      lance.x = x;
      lance.y = y;
      at.setPosition(x, y);

      const grp = Group.fromRange(this.width, at);
      grp.for((u) => {
        if (skewered.has(u.id)) return;
        if (!this.isVictim(u, owner)) return;

        // 80, then 40 more for every enemy already on the lance
        const damage = 80 + 40 * skewered.size;
        skewered.add(u.id);
        Effect.createAttachment(
          "Abilities/Spells/Undead/Impale/ImpaleHitTarget.mdl",
          u,
          "chest",
        ).destroy();
        StunUtils.stunUnit(u.handle, 0.75);
        dummy.damageTarget(
          u.handle,
          damage,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      if (travelled < this.length) return;

      TimerUtils.releaseTimer(t);
      lance.destroy();
      at.destroy();
    });
  }

  // The direction, of 24 round the hero, whose line holds the most enemies
  private bestLine(hero: Unit, owner: MapPlayer): number | undefined {
    const { x, y } = hero;
    const enemies: Unit[] = [];
    const grp = Group.fromRange(this.length, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;

      enemies.push(u);
    });
    grp.destroy();

    let best: number | undefined;
    let bestCount = 0;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let count = 0;
      for (const u of enemies) {
        const along = (u.x - x) * cos + (u.y - y) * sin;
        if (along < 0) continue;
        const across = Math.abs(-(u.x - x) * sin + (u.y - y) * cos);
        if (across <= this.width) count++;
      }
      if (count > bestCount) {
        best = angle;
        bestCount = count;
      }
    }
    return best;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    return true;
  }
}
