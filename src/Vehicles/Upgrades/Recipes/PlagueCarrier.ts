import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class PlagueCarrier extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I050");
  public readonly merchantItemTypeId = FourCC("I051");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly mineUnitTypeId: number = FourCC("n00Y");
  private readonly dummyUnitTypeId: number = FourCC("u000");
  private readonly crippleAbilityId: number = FourCC("A03P");

  // The mine uses the land mine's own Mine ability (A00E): once armed it
  // kills itself when an enemy ground unit comes close, and that enemy
  // carries the plague. A mine that expires finds nobody to carry it.
  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const mine = Unit.fromEvent();
      if (mine.typeId !== this.mineUnitTypeId) return;

      const { owner, x, y } = mine;
      let carrier: Unit | undefined;
      let carrierDistance = 0;
      const grp = Group.fromRange(200, mine.point);
      grp.for((u) => {
        if (!this.isVictim(u, owner)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (carrier != null && distance >= carrierDistance) return;
        carrier = u;
        carrierDistance = distance;
      });
      grp.destroy();
      mine.destroy();
      if (carrier != null) this.infect(owner, carrier);
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const mine = Unit.create(owner, this.mineUnitTypeId, x, y);
      mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
    });
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
  }

  private infect(owner: MapPlayer, carrier: Unit): void {
    const dummy = Unit.create(
      owner,
      this.dummyUnitTypeId,
      carrier.x,
      carrier.y,
    );
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.crippleAbilityId);
    dummy.issueTargetOrder(OrderId.Cripple, carrier);

    const plague = Effect.createAttachment(
      "Units/Undead/PlagueCloud/PlagueCloudtarget.mdl",
      carrier,
      "overhead",
    );
    // The plague bursts where the carrier is, or where it fell
    let { x, y } = carrier;
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.25, true, () => {
      elapsed += 0.25;
      if (carrier.isAlive()) {
        x = carrier.x;
        y = carrier.y;
      }
      if (elapsed < 3 && carrier.isAlive()) return;

      TimerUtils.releaseTimer(t);
      plague.destroy();
      this.burst(owner, x, y);
    });
  }

  private burst(owner: MapPlayer, x: number, y: number): void {
    Effect.create(
      "Objects/Spawnmodels/Undead/UndeadLargeDeathExplode/UndeadLargeDeathExplode.mdl",
      x,
      y,
    ).destroy();
    Effect.create(
      "Units/Undead/PlagueCloud/PlagueCloudtarget.mdl",
      x,
      y,
    ).destroy();
    const dummy = Unit.create(owner, this.dummyUnitTypeId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    const grp = Group.fromRange(250, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        300,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return true;
  }
}
