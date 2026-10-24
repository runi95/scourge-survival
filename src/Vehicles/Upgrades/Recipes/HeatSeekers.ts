import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { HeatSeekersDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/HeatSeekersDamageEvent";

interface Launcher {
  fireballs: Timer;
  rockets: Timer;
}

// Every 1.5 seconds a fireball (u02P: 100, 125 splash, air & ground) that
// sets every enemy it hits on fire for 5 s (HeatSeekersDamageEvent). Every
// 0.5 seconds a homing rocket (u02Q: 25) at every burning enemy within 900 of the
// hero
export class HeatSeekers extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I058");
  public readonly merchantItemTypeId = FourCC("I059");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I00N")];

  private readonly launchers = new Map<number, Launcher>();
  private readonly fireballUnitId: number = FourCC("u02P");
  private readonly rocketUnitId: number = FourCC("u02Q");
  // Only one timer burns the fires down, however many own the weapon
  private burnTimer: Timer | undefined;

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const fireballs = TimerUtils.newTimer();
    fireballs.start(this.cooldown, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.fireballUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    });

    const rockets = TimerUtils.newTimer();
    rockets.start(0.5, true, () => {
      const hero = vehicle.unit;
      HeatSeekersDamageEvent.BURNING.forEach((burning) => {
        if (burning.playerId !== owner.id) return;
        const u = burning.unit;
        if (!u.isAlive() || !u.isVisible(owner)) return;
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy > 900 * 900) return;

        const rocket = Unit.create(owner, this.rocketUnitId, hero.x, hero.y);
        rocket.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2.5);
        rocket.issueTargetOrder("attack", u);
      });
    });

    this.launchers.set(itemId, { fireballs, rockets });
    if (this.burnTimer == null) {
      this.burnTimer = TimerUtils.newTimer();
      this.burnTimer.start(0.25, true, () => this.burnDown());
    }
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const launcher = this.launchers.get(itemId);
    this.launchers.delete(itemId);
    if (launcher == null) return;
    TimerUtils.releaseTimer(launcher.fireballs);
    TimerUtils.releaseTimer(launcher.rockets);
  }

  private burnDown() {
    const out: number[] = [];
    HeatSeekersDamageEvent.BURNING.forEach((burning, id) => {
      burning.left -= 0.25;
      if (burning.left <= 0 || !burning.unit.isAlive()) out.push(id);
    });
    for (const id of out) {
      HeatSeekersDamageEvent.BURNING.get(id).effect.destroy();
      HeatSeekersDamageEvent.BURNING.delete(id);
    }
  }
}
