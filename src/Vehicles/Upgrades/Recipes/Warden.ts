import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// A Warden fights by the hero's side, and comes again 10 seconds after she
// falls. Every 3 seconds she blinks into the largest enemy group within 800
// of the hero and whirls poisoned knives around her, cutting, poisoning and
// slowing every enemy within 300. Whenever her knives kill, she blinks on to
// the next group at once
export class Warden extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0EY");
  public readonly merchantItemTypeId = FourCC("I0EZ");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I05R")];

  private readonly timers = new Map<number, Timer>();
  private readonly wardens = new Map<number, Unit>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly wardenUnitTypeId: number = FourCC("e005");
  private readonly poisonAbilityId: number = FourCC("A056");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      const { x, y } = vehicle.unit;
      Effect.create(
        "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
        x + 150,
        y,
      ).destroy();
      this.wardens.set(
        itemId,
        Unit.create(owner, this.wardenUnitTypeId, x + 150, y),
      );
    };

    let elapsed = 0;
    let fallen = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      elapsed++;
      const warden = this.wardens.get(itemId);
      if (warden.isAlive()) {
        if (elapsed % 3 === 0) this.hunt(warden, vehicle.unit, 5);
        return;
      }

      fallen++;
      if (fallen === 1) {
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }
      if (fallen < this.cooldown) return;
      fallen = 0;
      summon();
    });
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

    this.wardens.get(itemId)?.kill();
    this.wardens.delete(itemId);
  }

  private enemiesAround(owner: MapPlayer, x: number, y: number, r: number) {
    const enemies: Unit[] = [];
    const at = Point.create(x, y);
    const grp = Group.fromRange(r, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }

  // Blinks into the largest group within 800 of the hero and whirls her
  // knives there; a kill sends her on to the next group, up to `left` blinks
  private hunt(warden: Unit, hero: Unit, left: number): void {
    const { owner } = warden;
    const enemies = this.enemiesAround(owner, hero.x, hero.y, 800);
    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= bestCount) continue;
      best = candidate;
      bestCount = count;
    }
    if (best == null) {
      // Nothing to hunt: she keeps close to the hero
      const dx = hero.x - warden.x;
      const dy = hero.y - warden.y;
      if (dx * dx + dy * dy > 500 * 500) {
        warden.issueOrderAt(OrderId.Move, hero.x + 150, hero.y);
      }
      return;
    }

    Effect.create(
      "Abilities/Spells/NightElf/Blink/BlinkCaster.mdl",
      warden.x,
      warden.y,
    ).destroy();
    warden.setPosition(best.x, best.y);
    Effect.create(
      "Abilities/Spells/NightElf/Blink/BlinkTarget.mdl",
      warden.x,
      warden.y,
    ).destroy();
    Effect.create(
      "Abilities/Spells/NightElf/FanOfKnives/FanOfKnivesCaster.mdl",
      warden.x,
      warden.y,
    ).destroy();

    let killed = false;
    for (const u of this.enemiesAround(owner, warden.x, warden.y, 300)) {
      warden.damageTarget(
        u.handle,
        100,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) {
        killed = true;
        continue;
      }

      const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(this.poisonAbilityId);
      dummy.issueTargetOrder("shadowstrike", u);
    }
    warden.issueOrderAt(OrderId.Attack, warden.x, warden.y);
    if (!killed || left <= 1) return;

    const t = TimerUtils.newTimer();
    t.start(0.4, false, () => {
      TimerUtils.releaseTimer(t);
      if (warden.isAlive()) this.hunt(warden, hero, left - 1);
    });
  }
}
