import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../Utility/Globals";

const MULT = Math.PI / 180;

// A Frost Wyrm whose breath cripples (RavenousWyrmDamageEvent) and that grows
// 10% bigger and stronger with every enemy it kills, up to 10 times
export class RavenousWyrm extends WeaponUpgradeRecipe {
  public readonly cooldown = 60;
  public readonly itemTypeId = FourCC("I0B0");
  public readonly merchantItemTypeId = FourCC("I0B1");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I04O")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemWyrms = new Map<number, Unit>();
  // Kills eaten, by wyrm handle id
  private readonly meals = new Map<number, number>();
  private readonly wyrmUnitTypeId: number = FourCC("u02D");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const killer = GetKillingUnit();
      if (killer == null || GetUnitTypeId(killer) !== this.wyrmUnitTypeId)
        return;

      const wyrm = Unit.fromHandle(killer);
      const meals = this.meals.get(wyrm.id) ?? 0;
      if (meals >= 10 || !wyrm.isAlive()) return;

      // Grows from what it was summoned with, both its breaths
      this.meals.set(wyrm.id, meals + 1);
      const growth = (1 + 0.1 * (meals + 1)) / (1 + 0.1 * meals);
      for (const weapon of [0, 1]) {
        const damage = wyrm.getBaseDamage(weapon);
        wyrm.setBaseDamage(Math.floor(damage * growth), weapon);
      }
      const scale = 1 + 0.1 * (meals + 1);
      wyrm.setScale(scale, scale, scale);
      Effect.createAttachment(
        "Abilities/Spells/Undead/DeathPact/DeathPactTarget.mdl",
        wyrm,
        "origin",
      ).destroy();
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const wx = x + 200 * Math.cos(radians);
      const wy = y + 200 * Math.sin(radians);
      Effect.create(
        "Abilities/Spells/Orc/FrostWyrm/feralspirittarget.mdl",
        wx,
        wy,
      ).destroy();
      const wyrm = Unit.create(owner, this.wyrmUnitTypeId, wx, wy);
      wyrm.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 45);
      const previous = this.itemWyrms.get(itemId);
      if (previous != null) this.meals.delete(previous.id);
      this.itemWyrms.set(itemId, wyrm);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
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

    const wyrm = this.itemWyrms.get(itemId);
    this.itemWyrms.delete(itemId);
    if (wyrm == null) return;
    this.meals.delete(wyrm.id);
    if (wyrm.isAlive()) wyrm.kill();
  }
}
