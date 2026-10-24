import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { BeatersDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BeatersDamageEvent";

const MULT = Math.PI / 180;

interface Hunt {
  mines: Unit[];
  // Seconds each mine has lain there
  ages: Map<Unit, number>;
  wolves: Unit[];
  timers: Timer[];
}

// Every 3 seconds a mine (n005: 150, 180 s) under the hero. Every 30 seconds
// 3 wolves (o004: 46 - 47, 15% x2 crit, 25 s); every enemy a wolf bites is
// shoved up to 150 over 0.2 s towards the nearest armed mine (4 s old) within
// 400 of it
export class Beaters extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I09C");
  public readonly merchantItemTypeId = FourCC("I09D");
  public readonly recipe: number[] = [FourCC("I05I"), FourCC("I003")];

  private readonly hunts = new Map<number, Hunt>();
  private readonly mineUnitId: number = FourCC("n005");
  private readonly wolfUnitId: number = FourCC("o004");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hunt: Hunt = { mines: [], ages: new Map(), wolves: [], timers: [] };
    this.hunts.set(itemId, hunt);

    const mines = TimerUtils.newTimer();
    mines.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const mine = Unit.create(owner, this.mineUnitId, hero.x, hero.y);
      mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
      hunt.mines.push(mine);
      hunt.ages.set(mine, 0);
    });

    const age = TimerUtils.newTimer();
    age.start(0.5, true, () => {
      for (let i = hunt.mines.length - 1; i >= 0; i--) {
        const mine = hunt.mines[i];
        if (mine.isAlive()) {
          hunt.ages.set(mine, hunt.ages.get(mine) + 0.5);
          continue;
        }
        hunt.ages.delete(mine);
        hunt.mines.splice(i, 1);
      }
    });

    const summon = () => {
      const hero = vehicle.unit;
      for (const wolf of hunt.wolves) BeatersDamageEvent.WOLVES.delete(wolf.id);
      hunt.wolves.length = 0;
      for (let i = 0; i < 3; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = hero.x + 150 * Math.cos(radians);
        const wy = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wolf = Unit.create(owner, this.wolfUnitId, wx, wy);
        wolf.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 25);
        hunt.wolves.push(wolf);
        BeatersDamageEvent.WOLVES.set(wolf.id, (bitten) =>
          this.shove(hunt, bitten),
        );
      }
    };
    const wolves = TimerUtils.newTimer();
    wolves.start(30, true, summon);
    hunt.timers.push(mines, age, wolves);
    summon();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const hunt = this.hunts.get(itemId);
    this.hunts.delete(itemId);
    if (hunt == null) return;
    for (const t of hunt.timers) TimerUtils.releaseTimer(t);
    hunt.timers.length = 0;
    for (const wolf of hunt.wolves) {
      BeatersDamageEvent.WOLVES.delete(wolf.id);
      if (wolf.isAlive()) wolf.kill();
    }
    hunt.wolves.length = 0;
    hunt.mines.length = 0;
    hunt.ages.clear();
  }

  // Towards the nearest armed mine within 400
  private shove(hunt: Hunt, bitten: Unit) {
    if (!bitten.isAlive()) return;
    if (bitten.isUnitType(UNIT_TYPE_FLYING)) return;
    let nearest: Unit | undefined;
    let nearestDist = 0;
    for (const mine of hunt.mines) {
      if (!mine.isAlive() || hunt.ages.get(mine) < 4) continue;
      const dx = mine.x - bitten.x;
      const dy = mine.y - bitten.y;
      const d = dx * dx + dy * dy;
      if (d > 400 * 400) continue;
      if (nearest == null || d < nearestDist) {
        nearest = mine;
        nearestDist = d;
      }
    }
    if (nearest == null) return;
    const d = Math.sqrt(nearestDist);
    if (d < 25) return;
    const step = Math.min(150, d) / 4;
    const ca = (nearest.x - bitten.x) / d;
    const sa = (nearest.y - bitten.y) / d;
    let steps = 0;
    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      if (bitten.isAlive()) {
        bitten.x = bitten.x + step * ca;
        bitten.y = bitten.y + step * sa;
      }
      if (++steps < 4) return;
      TimerUtils.releaseTimer(t);
    });
  }
}
