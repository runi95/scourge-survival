import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Tide {
  elemental: Unit | undefined;
  // Seconds until the next elemental, and until its next slam
  next: number;
  slam: number;
  timer: Timer;
}

// Every 15 seconds a Water Elemental (h002, the base weapon's, 14 s) on
// walkable ground 250 from the hero. Every 4 seconds it slams: a ring rolls
// out from it 500 a second to 500. Every enemy ground unit the ring reaches
// takes 40 and is carried along on the ring (as far as the ground is
// walkable); where it breaks every carried
// enemy takes 40 more and is slowed by 50% for 3 s (A05L)
export class Riptide extends WeaponUpgradeRecipe {
  public readonly cooldown = 15;
  public readonly itemTypeId = FourCC("I06E");
  public readonly merchantItemTypeId = FourCC("I06F");
  public readonly recipe: number[] = [FourCC("I00M"), FourCC("I05C")];

  private readonly tides = new Map<number, Tide>();
  private readonly elementalUnitId: number = FourCC("h002");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly slowAbilityId: number = FourCC("A05L");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tide: Tide = {
      elemental: undefined,
      next: 0,
      slam: 4,
      timer: TimerUtils.newTimer(),
    };
    this.tides.set(itemId, tide);

    tide.timer.start(0.5, true, () => {
      const hero = vehicle.unit;
      tide.next -= 0.5;
      if (tide.next <= 0) {
        tide.next = this.cooldown;
        tide.slam = 1;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        const start = RandomNumberGenerator.random(0, 359);
        let x = hero.x;
        let y = hero.y;
        for (let i = 0; i < 12; i++) {
          const radians = (start + 30 * i) * MULT;
          x = hero.x + 250 * Math.cos(radians);
          y = hero.y + 250 * Math.sin(radians);
          if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) break;
        }
        const elemental = Unit.create(owner, this.elementalUnitId, x, y);
        elemental.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 14);
        elemental.setAnimation("birth");
        elemental.queueAnimation("stand");
        tide.elemental = elemental;
      }

      const elemental = tide.elemental;
      if (elemental == null || !elemental.isAlive()) return;
      tide.slam -= 0.5;
      if (tide.slam > 0) return;
      tide.slam = 4;
      elemental.setAnimation("attack slam");
      elemental.queueAnimation("stand");
      this.roll(hero, owner, elemental.x, elemental.y);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const tide = this.tides.get(itemId);
    this.tides.delete(itemId);
    if (tide == null) return;
    TimerUtils.releaseTimer(tide.timer);
    if (tide.elemental != null) tide.elemental.kill();
  }

  private roll(hero: Unit, owner: MapPlayer, cx: number, cy: number) {
    Effect.create(
      "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
      cx,
      cy,
    ).destroy();
    // Everything on the ring, and the angle it rides it at
    const carried = new Map<Unit, number>();
    let radius = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      radius += 25;
      const at = Point.create(cx, cy);
      const grp = Group.fromRange(radius, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;
        if (carried.has(u)) return;

        carried.set(u, Atan2(u.y - cy, u.x - cx));
        hero.damageTarget(
          u.handle,
          40,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
      at.destroy();

      carried.forEach((radians, u) => {
        if (!u.isAlive()) return;
        const x = cx + radius * Math.cos(radians);
        const y = cy + radius * Math.sin(radians);
        // Washed up against a cliff, it stays there
        if (IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) return;
        u.x = x;
        u.y = y;
      });
      if (radius % 100 === 0) {
        for (let i = 0; i < 12; i++) {
          const radians = (30 * i + radius / 10) * MULT;
          Effect.create(
            "Abilities/Spells/Other/CrushingWave/CrushingWaveDamage.mdl",
            cx + radius * Math.cos(radians),
            cy + radius * Math.sin(radians),
          ).destroy();
        }
      }
      if (radius < 500) return;

      TimerUtils.releaseTimer(t);
      carried.forEach((_radians, u) => {
        if (!u.isAlive()) return;
        Effect.create(
          "Objects/Spawnmodels/Naga/NagaDeath/NagaDeath.mdl",
          u.x,
          u.y,
        ).destroy();
        hero.damageTarget(
          u.handle,
          40,
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
    });
  }
}
