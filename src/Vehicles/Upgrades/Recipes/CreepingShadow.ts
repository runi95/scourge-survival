import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Shade {
  effect: Effect;
  x: number;
  y: number;
  left: number;
}

// Shades are left behind the hero like mines. Once an enemy ground unit comes
// near one, it creeps up on it and bursts beneath it
export class CreepingShadow extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0BO");
  public readonly merchantItemTypeId = FourCC("I0BP");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I003")];

  private readonly placeTimers = new Map<number, Timer>();
  private readonly creepTimers = new Map<number, Timer>();
  private readonly itemShades = new Map<number, Shade[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly maxShades = 5;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const shades: Shade[] = [];
    this.itemShades.set(itemId, shades);

    const place: Timer = TimerUtils.newTimer();
    this.placeTimers.set(itemId, place);
    place.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (shades.length >= this.maxShades) return;

      const { x, y } = vehicle.unit;
      const effect = Effect.create("Units/Undead/Shade/Shade.mdl", x, y);
      effect.setAlpha(120);
      effect.scale = 0.8;
      shades.push({ effect, x, y, left: 60 });
    });

    const at = Point.create(0, 0);
    const creep: Timer = TimerUtils.newTimer();
    this.creepTimers.set(itemId, creep);
    creep.start(0.05, true, () => {
      for (let i = shades.length - 1; i >= 0; i--) {
        const shade = shades[i];
        shade.left -= 0.05;
        at.setPosition(shade.x, shade.y);
        const prey = this.nearest(owner, at, 500);
        if (prey == null) {
          if (shade.left > 0) continue;
          shades.splice(i, 1);
          shade.effect.destroy();
          continue;
        }

        const dx = prey.x - shade.x;
        const dy = prey.y - shade.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 60) {
          // Creeps at 350 a second
          const step = Math.min(distance, 350 * 0.05);
          shade.x += (step * dx) / distance;
          shade.y += (step * dy) / distance;
          shade.effect.x = shade.x;
          shade.effect.y = shade.y;
          shade.effect.setYaw(Math.atan2(dy, dx));
          continue;
        }

        shades.splice(i, 1);
        shade.effect.destroy();
        this.burst(owner, shade.x, shade.y);
      }
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    TimerUtils.releaseTimer(this.placeTimers.get(itemId));
    this.placeTimers.delete(itemId);
    TimerUtils.releaseTimer(this.creepTimers.get(itemId));
    this.creepTimers.delete(itemId);

    for (const shade of this.itemShades.get(itemId) ?? [])
      shade.effect.destroy();
    this.itemShades.delete(itemId);
  }

  private burst(owner: MapPlayer, x: number, y: number): void {
    Effect.create(
      "Abilities/Spells/Undead/DeathCoil/DeathCoilSpecialArt.mdl",
      x,
      y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    const grp = Group.fromRange(200, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        175,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }

  private nearest(
    owner: MapPlayer,
    at: Point,
    range: number,
  ): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDistance = 0;
    const grp = Group.fromRange(range, at);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      const distance =
        (u.x - at.x) * (u.x - at.x) + (u.y - at.y) * (u.y - at.y);
      if (nearest != null && distance >= nearestDistance) return;
      nearest = u;
      nearestDistance = distance;
    });
    grp.destroy();
    return nearest;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }
}
