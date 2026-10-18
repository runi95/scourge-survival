import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

interface Spirit {
  effect: Effect;
  // Seconds left, or undefined for the three that never leave
  left?: number;
  reload: number;
}

interface Ring {
  vehicle: Vehicle;
  owner: MapPlayer;
  weaponIndex: number;
  spirits: Spirit[];
  turn: number;
}

// The spirits of enemies that die near the hero rise and join a ring around
// it for 20 seconds, up to 8 of them besides the 3 that never leave; every
// spirit fires a spirit missile at a nearby enemy every 0.35 seconds
export class RestlessSpirits extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.35;
  public readonly itemTypeId = FourCC("I0F2");
  public readonly merchantItemTypeId = FourCC("I0F3");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I05K")];

  private readonly timers = new Map<number, Timer>();
  private readonly rings = new Map<number, Ring>();
  // Spirit Tower's spirit: shoots one spirit missile at an enemy in range
  private readonly spiritUnitTypeId: number = FourCC("u00V");
  private readonly maxRisen = 8;

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      if (dying.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      for (const [_itemId, ring] of this.rings) {
        const hero = ring.vehicle.unit;
        if (hero == null || !hero.isAlive()) continue;
        if (!dying.isEnemy(ring.owner)) continue;
        const dx = dying.x - hero.x;
        const dy = dying.y - hero.y;
        if (dx * dx + dy * dy > 800 * 800) continue;
        if (ring.spirits.length >= 3 + this.maxRisen) continue;

        Effect.create(
          "Abilities/Spells/Undead/DeathCoil/DeathCoilSpecialArt.mdl",
          dying.x,
          dying.y,
        ).destroy();
        ring.spirits.push(this.spirit(hero, 20));
      }
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const ring: Ring = {
      vehicle,
      owner,
      weaponIndex,
      spirits: [
        this.spirit(vehicle.unit),
        this.spirit(vehicle.unit),
        this.spirit(vehicle.unit),
      ],
      turn: 0,
    };
    this.rings.set(itemId, ring);

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.05, true, () => this.tick(ring));
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

    const ring = this.rings.get(itemId);
    this.rings.delete(itemId);
    for (const spirit of ring?.spirits ?? []) spirit.effect.destroy();
  }

  private spirit(hero: Unit, left?: number): Spirit {
    const effect = Effect.create(
      "Abilities/Weapons/ZigguratMissile/ZigguratMissile.mdl",
      hero.x,
      hero.y,
    );
    effect.setHeight(120);
    return { effect, left, reload: RandomNumberGenerator.random(0, 10) / 20 };
  }

  private tick(ring: Ring): void {
    const hero = ring.vehicle.unit;
    ring.turn += 0.05;
    ring.spirits = ring.spirits.filter((spirit) => {
      if (spirit.left == null) return true;
      spirit.left -= 0.05;
      if (spirit.left > 0) return true;
      spirit.effect.destroy();
      return false;
    });

    let enemies: Unit[] | undefined;
    const count = ring.spirits.length;
    for (let i = 0; i < count; i++) {
      const spirit = ring.spirits[i];
      // A lap every 3 seconds, 140 from the hero
      const angle = (ring.turn * 2 * Math.PI) / 3 + (i * 2 * Math.PI) / count;
      const x = hero.x + 140 * Math.cos(angle);
      const y = hero.y + 140 * Math.sin(angle);
      spirit.effect.x = x;
      spirit.effect.y = y;

      spirit.reload -= 0.05;
      if (spirit.reload > 0) continue;
      spirit.reload += this.cooldown;

      enemies ??= this.enemiesNear(hero, ring.owner);
      if (enemies.length === 0) continue;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const missile = Unit.create(ring.owner, this.spiritUnitTypeId, x, y);
      missile.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      missile.issueTargetOrder("attack", target);
    }
    if (enemies != null && enemies.length > 0) {
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[ring.weaponIndex],
        this.cooldown,
      );
    }
  }

  private enemiesNear(hero: Unit, owner: MapPlayer): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(500, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }
}
