import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Cloud {
  x: number;
  y: number;
  // Seconds until it comes down
  left: number;
  effect: Effect;
}

interface Squadron {
  machines: Unit[];
  clouds: Cloud[];
  ticks: number;
  timer: Timer;
}

// 3 Flying Machines (h00E, no attack of their own) fly over random enemies
// within 450 of the hero, or to random points within 350 of it. Every second each seeds a cloud where it is; 2
// seconds later the cloud comes down: 40 to every enemy within 150 of it
export class CloudSeeders extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I05S");
  public readonly merchantItemTypeId = FourCC("I05T");
  public readonly recipe: number[] = [FourCC("I006"), FourCC("I05E")];

  private readonly squadrons = new Map<number, Squadron>();
  private readonly seederUnitId: number = FourCC("h00E");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const squadron: Squadron = {
      machines: [],
      clouds: [],
      ticks: 0,
      timer: TimerUtils.newTimer(),
    };
    this.squadrons.set(itemId, squadron);
    for (let i = 0; i < 3; i++) {
      squadron.machines.push(
        Unit.create(
          owner,
          this.seederUnitId,
          vehicle.unit.x + RandomNumberGenerator.random(-250, 250),
          vehicle.unit.y + RandomNumberGenerator.random(-250, 250),
        ),
      );
    }

    squadron.timer.start(0.25, true, () => {
      const hero = vehicle.unit;
      squadron.ticks++;

      for (const cloud of squadron.clouds) {
        cloud.left -= 0.25;
        if (cloud.left <= 0) this.snow(hero, owner, cloud);
      }
      squadron.clouds = squadron.clouds.filter((c) => c.left > 0);

      if (squadron.ticks % 4 !== 0) return;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const enemies: Unit[] = [];
      const grp = Group.fromRange(450, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();
      for (const machine of squadron.machines) {
        squadron.clouds.push({
          x: machine.x,
          y: machine.y,
          left: 2,
          effect: Effect.create(
            "Abilities/Spells/Human/CloudOfFog/CloudOfFog.mdl",
            machine.x,
            machine.y,
          ),
        });
        // Over an enemy near the hero, or anywhere around it
        if (enemies.length > 0) {
          const enemy =
            enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
          machine.issueOrderAt("move", enemy.x, enemy.y);
          continue;
        }
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const r = RandomNumberGenerator.random(100, 350);
        machine.issueOrderAt(
          "move",
          hero.x + r * Math.cos(radians),
          hero.y + r * Math.sin(radians),
        );
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
    const squadron = this.squadrons.get(itemId);
    this.squadrons.delete(itemId);
    if (squadron == null) return;
    TimerUtils.releaseTimer(squadron.timer);
    for (const machine of squadron.machines) machine.kill();
    for (const cloud of squadron.clouds) cloud.effect.destroy();
  }

  private snow(hero: Unit, owner: MapPlayer, cloud: Cloud) {
    cloud.effect.destroy();
    Effect.create(
      "Abilities/Spells/Human/Blizzard/BlizzardTarget.mdl",
      cloud.x,
      cloud.y,
    ).destroy();
    const at = Point.create(cloud.x, cloud.y);
    const grp = Group.fromRange(150, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

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
  }
}
