import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

interface Pack {
  // The 2 wolves that always run with the hero, and seconds until a fallen
  // one comes back
  core: (Unit | undefined)[];
  back: number[];
  extras: Unit[];
  timers: Timer[];
}

// 2 wolves (o004: 46 - 47, 15% x2 crit) for as long as the item is held, a
// fallen one back 10 s later. Every 3 seconds the hero stands still another
// joins, up to 5; every 2 seconds it moves, the oldest extra one goes. Wolves
// more than 500 from the hero are sent back to it
export class Den extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I09E");
  public readonly merchantItemTypeId = FourCC("I09F");
  public readonly recipe: number[] = [FourCC("I05I"), FourCC("I02L")];

  private readonly packs = new Map<number, Pack>();
  private readonly wolfUnitId: number = FourCC("o004");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pack: Pack = {
      core: [undefined, undefined],
      back: [0, 0],
      extras: [],
      timers: [],
    };
    this.packs.set(itemId, pack);

    let lastX = vehicle.unit.x;
    let lastY = vehicle.unit.y;
    let gather = 0;
    let leave = 0;
    const t = TimerUtils.newTimer();
    t.start(0.5, true, () => {
      const hero = vehicle.unit;
      for (let i = 0; i < 2; i++) {
        const wolf = pack.core[i];
        if (wolf != null && wolf.isAlive()) continue;
        if (wolf != null) {
          pack.core[i] = undefined;
          pack.back[i] = 10;
        }
        pack.back[i] -= 0.5;
        if (pack.back[i] <= 0) pack.core[i] = this.summon(hero, owner);
      }
      for (let i = pack.extras.length - 1; i >= 0; i--) {
        if (!pack.extras[i].isAlive()) pack.extras.splice(i, 1);
      }

      const still = hero.x === lastX && hero.y === lastY;
      lastX = hero.x;
      lastY = hero.y;
      if (still) {
        leave = 0;
        gather += 0.5;
        if (gather >= 3 && pack.extras.length < 3) {
          gather = 0;
          hero.startAbilityCooldown(
            weaponDummyAbilityIds[weaponIndex],
            this.cooldown,
          );
          pack.extras.push(this.summon(hero, owner));
        }
      } else {
        gather = 0;
        leave += 0.5;
        if (leave >= 2 && pack.extras.length > 0) {
          leave = 0;
          const gone = pack.extras.shift();
          Effect.create(
            "Abilities/Spells/Orc/FeralSpirit/feralspiritdone.mdl",
            gone.x,
            gone.y,
          ).destroy();
          gone.destroy();
        }
      }

      // The pack keeps up with the hero
      for (const wolf of [...pack.core, ...pack.extras]) {
        if (wolf == null || !wolf.isAlive()) continue;
        const dx = wolf.x - hero.x;
        const dy = wolf.y - hero.y;
        if (dx * dx + dy * dy < 500 * 500) continue;
        wolf.issueOrderAt("attack", hero.x, hero.y);
      }
    });
    pack.timers.push(t);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const pack = this.packs.get(itemId);
    this.packs.delete(itemId);
    if (pack == null) return;
    for (const t of pack.timers) TimerUtils.releaseTimer(t);
    pack.timers.length = 0;
    for (const wolf of [...pack.core, ...pack.extras]) {
      if (wolf != null && wolf.isAlive()) wolf.kill();
    }
    pack.core = [undefined, undefined];
    pack.extras.length = 0;
  }

  private summon(hero: Unit, owner: MapPlayer): Unit {
    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const x = hero.x + 150 * Math.cos(radians);
    const y = hero.y + 150 * Math.sin(radians);
    Effect.create(
      "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
      x,
      y,
    ).destroy();
    return Unit.create(owner, this.wolfUnitId, x, y);
  }
}
