import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Globals } from "../../../../Utility/Globals";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";

export class Tornado extends WeaponUpgrade {
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNTornado.blp";
  public readonly cost = 500;
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I00X");
  public readonly description = (
    level: number
  ) => `Summons a fierce tornado that slows enemy units' movement, randomly tosses enemy ground units into the air and damages all nearby enemies.

Damage: |cffffcc0025 - 180|r
Cooldown (damage): |cffffcc001s|r
Cooldown (summon): |cffffcc0010s|r
Area of Effect (damage): |cffffcc00650|r
Area of Effect (cyclone): |cffffcc00275|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly tornadoUnitTypeId: number = FourCC("n001");
  private readonly itemTornadoMap = new Map<number, Unit>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    t.start(10, true, () => {
      this.spawnTornado(vehicle, owner, itemId, weaponIndex);
    });

    this.spawnTornado(vehicle, owner, itemId, weaponIndex);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);

    const tornado = this.itemTornadoMap.get(itemId);
    if (tornado == null) return;

    tornado.kill();
  }

  private spawnTornado(
    vehicle: Vehicle,
    owner: MapPlayer,
    itemId: number,
    weaponIndex: number
  ) {
    const { x, y } = vehicle.unit;
    const tornado = Unit.create(owner, this.tornadoUnitTypeId, x, y);
    tornado.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 10);
    this.itemTornadoMap.set(itemId, tornado);

    tornado.issueOrderAt(
      "move",
      x + RandomNumberGenerator.random(-500, 500),
      y + RandomNumberGenerator.random(-500, 500)
    );

    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown
    );
  }
}
