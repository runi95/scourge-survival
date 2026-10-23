import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { GameMap } from "../../../Game/GameMap";

// Awakens a Mountain Giant by the hero, and again 10 seconds after it falls.
// Every 8 seconds it taunts every enemy within 500 into attacking it for 4
// seconds, and its uprooted tree hits every enemy around its target
export class MountainGiant extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0C8");
  public readonly merchantItemTypeId = FourCC("I0C9");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05N")];

  private readonly timers = new Map<number, Timer>();
  private readonly giants = new Map<number, Unit>();
  private readonly giantUnitTypeId: number = FourCC("e004");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const awaken = () => {
      const { x, y } = vehicle.unit;
      Effect.create(
        "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
        x + 150,
        y,
      ).destroy();
      const giant = Unit.create(owner, this.giantUnitTypeId, x + 150, y);
      this.giants.set(itemId, giant);
    };

    let elapsed = 0;
    let fallen = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      elapsed++;
      const giant = this.giants.get(itemId);
      if (giant.isAlive()) {
        if (elapsed % 8 === 0) this.taunt(giant);
        if (elapsed % 8 === 4) this.release(giant);
        // It keeps up with the hero between taunts
        if (elapsed % 8 >= 4) this.follow(giant, vehicle.unit);
        return;
      }

      fallen++;
      if (fallen === 1) {
        this.release(giant);
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }
      if (fallen < this.cooldown) return;
      fallen = 0;
      awaken();
    });
    awaken();
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

    const giant = this.giants.get(itemId);
    this.giants.delete(itemId);
    if (giant == null) return;
    this.release(giant);
    giant.kill();
  }

  private taunt(giant: Unit): void {
    const creeps = GameMap.REMAINING_PLAYER_CREEPS[giant.owner.id + 9];
    if (creeps == null) return;

    giant.issueImmediateOrder("taunt");
    for (const [_id, creep] of creeps) {
      if (!creep.unit.isAlive()) continue;
      // A Cursed Doll's taunt holds on until the doll breaks
      if (creep.tauntTarget != null && creep.tauntTarget.isAlive()) continue;

      const dx = creep.unit.x - giant.x;
      const dy = creep.unit.y - giant.y;
      if (dx * dx + dy * dy > 500 * 500) continue;

      creep.tauntTarget = giant;
      creep.unit.issueTargetOrder(OrderId.Attack, giant);
    }
  }

  // Sends the creeps it taunted back after the hero
  private release(giant: Unit): void {
    const playerId = giant.owner.id;
    const creeps = GameMap.REMAINING_PLAYER_CREEPS[playerId + 9];
    if (creeps == null) return;

    const vehicle = GameMap.PLAYER_VEHICLES[playerId];
    for (const [_id, creep] of creeps) {
      if (creep.tauntTarget?.handle !== giant.handle) continue;
      creep.tauntTarget = null;
      if (!creep.unit.isAlive()) continue;

      creep.attackOrderPosition = [vehicle.lastKnownX, vehicle.lastKnownY];
      creep.unit.issueOrderAt(
        OrderId.Attack,
        vehicle.lastKnownX,
        vehicle.lastKnownY,
      );
    }
  }

  private follow(giant: Unit, hero: Unit): void {
    const dx = hero.x - giant.x;
    const dy = hero.y - giant.y;
    if (dx * dx + dy * dy <= 400 * 400) return;

    giant.issueOrderAt(OrderId.Attack, hero.x, hero.y);
  }
}
