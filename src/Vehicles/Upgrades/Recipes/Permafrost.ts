import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Patch {
  x: number;
  y: number;
  radius: number;
  // Seconds of frost left
  left: number;
  crystals: Effect[];
}

interface Winter {
  patches: Patch[];
  casts: Timer;
  frost: Timer;
}

// Every 3 seconds a Blizzard over the enemy within 800 of the hero with the
// most enemies within 200 of it: 6 waves 0.5 s apart, 40 to every enemy within
// 200 (80 when it started on frozen ground). Where it falls the ground freezes
// for 20 s, 200 across; a Blizzard on frozen ground widens that patch by 100
// (up to 400) and freezes it for 20 s again. Every 0.5 s every enemy on
// frozen ground is slowed by 50% for 1 s (A05M)
export class Permafrost extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I06I");
  public readonly merchantItemTypeId = FourCC("I06J");
  public readonly recipe: number[] = [FourCC("I05E"), FourCC("I05E")];

  private readonly winters = new Map<number, Winter>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly slowAbilityId: number = FourCC("A05M");
  private readonly slowBuffId: number = FourCC("B006");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const winter: Winter = {
      patches: [],
      casts: TimerUtils.newTimer(),
      frost: TimerUtils.newTimer(),
    };
    this.winters.set(itemId, winter);

    winter.casts.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();
      let target: Unit | undefined;
      let most = 0;
      for (const u of enemies) {
        let around = 0;
        for (const v of enemies) {
          if ((v.x - u.x) ** 2 + (v.y - u.y) ** 2 <= 200 * 200) around++;
        }
        if (around > most) {
          target = u;
          most = around;
        }
      }
      if (target == null) return;
      this.blizzard(winter, hero, owner, target.x, target.y);
    });

    winter.frost.start(0.5, true, () => {
      const hero = vehicle.unit;
      for (const patch of winter.patches) {
        patch.left -= 0.5;
        if (patch.left <= 0) {
          for (const crystal of patch.crystals) crystal.destroy();
          continue;
        }
        const at = Point.create(patch.x, patch.y);
        const grp = Group.fromRange(patch.radius, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if (u.getAbilityLevel(this.slowBuffId) > 0) return;

          const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
          dummy.addAbility(this.slowAbilityId);
          dummy.issueTargetOrder("slow", u);
        });
        grp.destroy();
        at.destroy();
      }
      winter.patches = winter.patches.filter((p) => p.left > 0);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const winter = this.winters.get(itemId);
    this.winters.delete(itemId);
    if (winter == null) return;
    TimerUtils.releaseTimer(winter.casts);
    TimerUtils.releaseTimer(winter.frost);
    for (const patch of winter.patches) {
      for (const crystal of patch.crystals) crystal.destroy();
    }
  }

  private blizzard(
    winter: Winter,
    hero: Unit,
    owner: MapPlayer,
    x: number,
    y: number,
  ) {
    let patch = winter.patches.find(
      (p) => (p.x - x) ** 2 + (p.y - y) ** 2 <= p.radius * p.radius,
    );
    const frozen = patch != null;
    if (patch == null) {
      patch = { x, y, radius: 200, left: 20, crystals: [] };
      winter.patches.push(patch);
    } else {
      patch.radius = Math.min(400, patch.radius + 100);
      patch.left = 20;
    }
    // Ice crystals round the edge of the frozen ground
    for (const crystal of patch.crystals) crystal.destroy();
    patch.crystals = [];
    const count = Math.floor(patch.radius / 25);
    for (let i = 0; i < count; i++) {
      const radians = ((360 * i) / count) * MULT;
      const crystal = Effect.create(
        "Doodads/Icecrown/Rocks/Ice_Rock/Ice_Rock0.mdl",
        patch.x + patch.radius * Math.cos(radians),
        patch.y + patch.radius * Math.sin(radians),
      );
      crystal.scale = 0.4;
      patch.crystals.push(crystal);
    }

    const damage = frozen ? 80 : 40;
    let waves = 0;
    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      waves++;
      for (let i = 0; i < 4; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const r = RandomNumberGenerator.random(0, 200);
        Effect.create(
          "Abilities/Spells/Human/Blizzard/BlizzardTarget.mdl",
          x + r * Math.cos(radians),
          y + r * Math.sin(radians),
        ).destroy();
      }
      const at = Point.create(x, y);
      const grp = Group.fromRange(200, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hero.damageTarget(
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
      at.destroy();
      if (waves >= 6) TimerUtils.releaseTimer(t);
    });
  }
}
