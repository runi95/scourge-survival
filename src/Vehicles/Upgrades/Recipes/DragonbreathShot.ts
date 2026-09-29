import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;
export class DragonbreathShot extends WeaponUpgradeRecipe {
  public readonly cooldown = 5;
  public readonly itemTypeId = FourCC("I037");
  public readonly merchantItemTypeId = FourCC("I038");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I00Y")];

  private readonly timers = new Map<number, Timer>();
  private readonly dwarfUnitTypeId: number = FourCC("u010");
  private readonly itemTargetMap = new Map<number, [number, number]>();
  private readonly itemRiflemanMap = new Map<number, Unit>();
  private readonly itemIterations = new Map<number, number>();
  private readonly itemToDestinationMap = new Map<number, [number, number]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    this.itemIterations.set(itemId, 0);
    t.start(1, true, () => {
      const iterations = this.itemIterations.get(itemId);
      if (iterations == null) {
        TimerUtils.releaseTimer(t);
        return;
      }

      if (iterations >= 5) {
        const destination = this.itemToDestinationMap.get(itemId);
        if (destination == null) {
          this.itemIterations.set(itemId, 0);
          return;
        }

        const [dx, dy] = destination;
        const rifleman = Unit.create(owner, this.dwarfUnitTypeId, dx, dy);
        this.itemRiflemanMap.set(itemId, rifleman);

        const target = this.nearestEnemy(rifleman, owner);
        if (target != null) {
          rifleman.issueTargetOrder("drunkenhaze", target);
          this.itemTargetMap.set(itemId, [target.x, target.y]);
        }

        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );

        this.itemIterations.set(itemId, 0);
        this.itemToDestinationMap.delete(itemId);
      } else {
        if (iterations === 0) {
          this.breatheFire(itemId);
        } else if (iterations === 4) {
          const { x, y } = vehicle.unit;

          const randomAngle = RandomNumberGenerator.random(0, 359);
          const radian = randomAngle * MULT;
          const radius = RandomNumberGenerator.random(200, 700);
          const dx = radius * Math.cos(radian) + x;
          const dy = radius * Math.sin(radian) + y;
          this.itemToDestinationMap.set(itemId, [dx, dy]);
          Effect.create(
            "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
            dx,
            dy,
          ).destroy();
        } else if (iterations === 2) {
          const rifleman = this.itemRiflemanMap.get(itemId);
          if (rifleman != null) {
            const { x, y } = rifleman;
            Effect.create(
              "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
              x,
              y,
            ).destroy();
            rifleman.destroy();
            this.itemRiflemanMap.delete(itemId);
          }
        }

        this.itemIterations.set(itemId, iterations + 1);
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
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
    this.itemIterations.delete(itemId);
    this.itemToDestinationMap.delete(itemId);
    this.itemTargetMap.delete(itemId);

    const rifleman = this.itemRiflemanMap.get(itemId);
    if (rifleman == null) return;

    rifleman.destroy();
  }
  private breatheFire(itemId: number): void {
    const rifleman = this.itemRiflemanMap.get(itemId);
    const target = this.itemTargetMap.get(itemId);
    this.itemTargetMap.delete(itemId);
    if (rifleman == null || target == null) return;

    const [tx, ty] = target;
    const { x, y } = rifleman;
    const angle = Math.atan2(ty - y, tx - x);
    const distance = Math.min(
      650,
      Math.sqrt(Math.pow(tx - x, 2) + Math.pow(ty - y, 2)),
    );
    rifleman.issueOrderAt(
      "breathoffire",
      x + distance * Math.cos(angle),
      y + distance * Math.sin(angle),
    );
  }

  private nearestEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const { x, y } = source;
    let nearest: Unit | undefined;
    let nearestDistance = 2250000;
    const grp = Group.fromRange(1500, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const distance = Math.pow(u.x - x, 2) + Math.pow(u.y - y, 2);
      if (distance < nearestDistance) {
        nearest = u;
        nearestDistance = distance;
      }
    });
    grp.destroy();

    return nearest;
  }
}
