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
  slot: number;
  left?: number;
  reload: number;
}

interface Ring {
  vehicle: Vehicle;
  owner: MapPlayer;
  weaponIndex: number;
  spirits: Spirit[];
}

export class RestlessSpirits extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.35;
  public readonly itemTypeId = FourCC("I0F2");
  public readonly merchantItemTypeId = FourCC("I0F3");
  public readonly recipe: number[] = [FourCC("I02K"), FourCC("I05K")];

  private readonly timers = new Map<number, Timer>();
  private readonly rings = new Map<number, Ring>();
  private readonly spiritUnitTypeId: number = FourCC("u02F");
  private readonly maxRisen = 3;

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
        const slot = this.freeOuterSlot(ring);
        if (slot == null) continue;

        Effect.create(
          "Abilities/Spells/Undead/DeathCoil/DeathCoilSpecialArt.mdl",
          dying.x,
          dying.y,
        ).destroy();
        ring.spirits.push(this.spirit(ring, slot, 10));
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
    const ring: Ring = { vehicle, owner, weaponIndex, spirits: [] };
    for (let slot = 0; slot < 3; slot++) {
      ring.spirits.push(this.spirit(ring, slot));
    }
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

  private spirit(ring: Ring, slot: number, left?: number): Spirit {
    const effect = Effect.createAttachment(
      `war3mapImported/RestlessSoul${slot + 1}.mdx`,
      ring.vehicle.unit,
      "origin",
    );
    return {
      effect,
      slot,
      left,
      reload: RandomNumberGenerator.random(0, 10) / 20,
    };
  }

  private freeOuterSlot(ring: Ring): number | undefined {
    const step = Math.max(1, Math.floor(8 / this.maxRisen));
    for (let n = 0; n < this.maxRisen; n++) {
      const slot = 3 + ((n * step) % 8);
      if (!ring.spirits.some((s) => s.slot === slot)) return slot;
    }
    return undefined;
  }

  private tick(ring: Ring): void {
    const hero = ring.vehicle.unit;
    ring.spirits = ring.spirits.filter((spirit) => {
      if (spirit.left == null) return true;
      spirit.left -= 0.05;
      if (spirit.left > 0) return true;
      spirit.effect.destroy();
      return false;
    });

    let enemies: Unit[] | undefined;
    for (const spirit of ring.spirits) {
      spirit.reload -= 0.05;
      if (spirit.reload > 0) continue;
      spirit.reload += this.cooldown;

      enemies ??= this.enemiesNear(hero, ring.owner);
      if (enemies.length === 0) continue;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const radius = RandomNumberGenerator.random(180, 240);
      const angle =
        Math.atan2(target.y - hero.y, target.x - hero.x) +
        (RandomNumberGenerator.random(-45, 45) * Math.PI) / 180;
      const missile = Unit.create(
        ring.owner,
        this.spiritUnitTypeId,
        hero.x + radius * Math.cos(angle),
        hero.y + radius * Math.sin(angle),
      );
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
