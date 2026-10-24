import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Sky {
  // Seconds gathered, up to 6
  gathered: number;
  // Enemies within 600 of the hero at the last check
  near: Set<Unit>;
  falling: boolean;
  timer: Timer;
}

// A hammer gathers for up to 6 s over the hero (checked every 0.25 s). After
// at least 1 s it falls on an enemy that came within 600 of the hero since
// the last check, or on the nearest one within 600 once it has gathered 6 s.
// It drops from 600 up in 0.3 s: 70 for every second gathered and a 0.3 s
// stun for every second, and half the damage and the stun to every other
// enemy within 100 + 25 for every second
export class SkyHammer extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I07A");
  public readonly merchantItemTypeId = FourCC("I07B");
  public readonly recipe: number[] = [FourCC("I05D"), FourCC("I05D")];

  private readonly skies = new Map<number, Sky>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const sky: Sky = {
      gathered: 0,
      near: new Set(),
      falling: false,
      timer: TimerUtils.newTimer(),
    };
    this.skies.set(itemId, sky);
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    sky.timer.start(0.25, true, () => {
      const hero = vehicle.unit;
      if (sky.falling) return;
      sky.gathered = Math.min(6, sky.gathered + 0.25);

      const near = new Set<Unit>();
      let newcomer: Unit | undefined;
      let nearest: Unit | undefined;
      let nearestDist = 0;
      const grp = Group.fromRange(600, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        near.add(u);
        if (!sky.near.has(u)) newcomer = u;
        const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
        if (nearest == null || d < nearestDist) {
          nearest = u;
          nearestDist = d;
        }
      });
      grp.destroy();
      sky.near = near;

      let target: Unit | undefined;
      if (sky.gathered >= 1 && newcomer != null) target = newcomer;
      else if (sky.gathered >= 6) target = nearest;
      if (target == null) return;

      const gathered = sky.gathered;
      sky.gathered = 0;
      sky.falling = true;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.fall(hero, owner, target, gathered, () => {
        sky.falling = false;
      });
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const sky = this.skies.get(itemId);
    this.skies.delete(itemId);
    if (sky == null) return;
    TimerUtils.releaseTimer(sky.timer);
  }

  private fall(
    hero: Unit,
    owner: MapPlayer,
    target: Unit,
    gathered: number,
    landed: (this: void) => void,
  ) {
    const hammer = Effect.create(
      "Abilities/Spells/Human/StormBolt/StormBoltMissile.mdl",
      target.x,
      target.y,
    );
    hammer.scale = 1 + gathered / 3;
    hammer.setPitch(-Math.PI / 2);
    let step = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      hammer.x = target.x;
      hammer.y = target.y;
      hammer.z = 600 - 100 * step;
      if (step < 6) return;

      TimerUtils.releaseTimer(t);
      hammer.destroy();
      landed();
      const x = target.x;
      const y = target.y;
      Effect.create(
        "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
        x,
        y,
      ).destroy();
      Effect.create(
        "Abilities/Spells/Human/StormBolt/StormBoltTarget.mdl",
        x,
        y,
      ).destroy();

      const at = Point.create(x, y);
      const grp = Group.fromRange(100 + 25 * gathered, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
          u.handle,
          u === target ? 70 * gathered : 35 * gathered,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (u.isAlive()) StunUtils.stunUnit(u.handle, 0.3 * gathered);
      });
      grp.destroy();
      at.destroy();
    });
  }
}
