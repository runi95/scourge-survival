import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { ThornsAuraDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/ThornsAuraDamageEvent";

const MULT = Math.PI / 180;

interface Thorned {
  unit: Unit;
  thorns: Effect;
}

// Sheathes the hero in thorns, and every 20 seconds 2 thorned Treants for 15
// seconds. ThornsAuraDamageEvent cuts back every enemy whose attack lands on
// one of them
export class ThornsAura extends WeaponUpgradeRecipe {
  public readonly cooldown = 20;
  public readonly itemTypeId = FourCC("I0EE");
  public readonly merchantItemTypeId = FourCC("I0EF");
  public readonly recipe: number[] = [FourCC("I05N"), FourCC("I05R")];

  private readonly timers = new Map<number, Timer>();
  private readonly heroThorns = new Map<number, Effect>();
  private readonly itemTreants = new Map<number, Thorned[]>();
  private readonly treantUnitTypeId: number = FourCC("e003");

  public onAcquire(
    vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hero = vehicle.unit;
    this.heroThorns.set(
      itemId,
      Effect.createAttachment(
        "Abilities/Spells/NightElf/ThornsAura/ThornsAura.mdl",
        hero,
        "origin",
      ),
    );
    this.sheathe(hero, hero);

    const summon = () => {
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.unsheatheTreants(itemId);

      const { x, y } = hero;
      const treants: Thorned[] = [];
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = x + 150 * Math.cos(radians);
        const wy = y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
          wx,
          wy,
        ).destroy();
        const treant = Unit.create(hero.owner, this.treantUnitTypeId, wx, wy);
        treant.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
        this.sheathe(treant, hero);
        treants.push({
          unit: treant,
          thorns: Effect.createAttachment(
            "Abilities/Spells/NightElf/ThornsAura/ThornsAura.mdl",
            treant,
            "origin",
          ),
        });
      }
      this.itemTreants.set(itemId, treants);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
  }

  public onDrop(
    vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);

    this.heroThorns.get(itemId)?.destroy();
    this.heroThorns.delete(itemId);
    this.unsheathe(vehicle.unit);

    for (const treant of this.itemTreants.get(itemId) ?? []) {
      if (treant.unit.isAlive()) treant.unit.kill();
    }
    this.unsheatheTreants(itemId);
  }

  private sheathe(unit: Unit, hero: Unit): void {
    const bearer = ThornsAuraDamageEvent.BEARERS.get(unit.id);
    if (bearer != null) {
      bearer.count++;
      return;
    }
    ThornsAuraDamageEvent.BEARERS.set(unit.id, { hero, count: 1 });
  }

  private unsheathe(unit: Unit): void {
    const bearer = ThornsAuraDamageEvent.BEARERS.get(unit.id);
    if (bearer == null) return;
    bearer.count--;
    if (bearer.count > 0) return;
    ThornsAuraDamageEvent.BEARERS.delete(unit.id);
  }

  // The last Treants have run out by the time new ones come
  private unsheatheTreants(itemId: number): void {
    for (const treant of this.itemTreants.get(itemId) ?? []) {
      treant.thorns.destroy();
      this.unsheathe(treant.unit);
    }
    this.itemTreants.delete(itemId);
  }
}
