import { Effect, Item, MapPlayer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

interface Nest {
  vehicle: Vehicle;
  owner: MapPlayer;
  weaponIndex: number;
  ready: boolean;
}

export class CarrionBeetleNest extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I044");
  public readonly merchantItemTypeId = FourCC("I045");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I001")];

  private readonly nests = new Map<number, Nest>();
  private readonly beetleUnitTypeId: number = FourCC("u017");
  private readonly locustAbilityId: number = FourCC("Aloc");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      if (dying.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (dying.getAbilityLevel(this.locustAbilityId) > 0) return;

      for (const [_itemId, nest] of this.nests) {
        if (!nest.ready) continue;
        const hero = nest.vehicle.unit;
        if (hero == null || !hero.isAlive()) continue;
        if (!dying.isEnemy(nest.owner)) continue;
        const dx = dying.x - hero.x;
        const dy = dying.y - hero.y;
        if (dx * dx + dy * dy > 900 * 900) continue;

        this.summonBeetles(nest, dying);
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
    this.nests.set(itemId, { vehicle, owner, weaponIndex, ready: true });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    this.nests.delete(itemId);
  }

  private summonBeetles(nest: Nest, dying: Unit): void {
    nest.ready = false;
    nest.vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[nest.weaponIndex],
      this.cooldown,
    );

    Effect.create(
      "Units\\Undead\\PlagueCloud\\PlagueCloudtarget.mdl",
      dying.x,
      dying.y,
    ).destroy();
    for (let i = 0; i < 2; i++) {
      const beetle = Unit.create(
        nest.owner,
        this.beetleUnitTypeId,
        dying.x,
        dying.y,
        dying.facing,
      );
      beetle.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
    }

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, false, () => {
      TimerUtils.releaseTimer(t);
      nest.ready = true;
    });
  }
}
