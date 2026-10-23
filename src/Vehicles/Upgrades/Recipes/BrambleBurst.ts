import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

// Waits until 3 or more enemies close in within 400 of the hero, then
// brambles burst out of the ground: every enemy within 500 is cut and every
// enemy ground unit there is held in thorny roots. The brambles regrow for 4
// seconds before they can burst again
export class BrambleBurst extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0EG");
  public readonly merchantItemTypeId = FourCC("I0EH");
  public readonly recipe: number[] = [FourCC("I05R"), FourCC("I05P")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly rootsAbilityId: number = FourCC("A046");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    let regrowing = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      if (regrowing > 0) {
        regrowing -= 0.25;
        return;
      }

      const hero = vehicle.unit;
      const enemies: Unit[] = [];
      let close = 0;
      const grp = Group.fromRange(500, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy <= 400 * 400) close++;
      });
      grp.destroy();
      if (close < 3) return;

      regrowing = this.cooldown;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.burst(hero, owner, enemies);
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

  private burst(hero: Unit, owner: MapPlayer, enemies: Unit[]): void {
    for (let i = 0; i < 12; i++) {
      const radians = i * 30 * MULT;
      for (const distance of [200, 400]) {
        Effect.create(
          "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
          hero.x + distance * Math.cos(radians),
          hero.y + distance * Math.sin(radians),
        ).destroy();
      }
    }

    for (const u of enemies) {
      hero.damageTarget(
        u.handle,
        110,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      Effect.createAttachment(
        "Abilities/Spells/NightElf/ThornsAura/ThornsAuraDamage.mdl",
        u,
        "chest",
      ).destroy();
      if (!u.isAlive()) continue;
      if (u.isUnitType(UNIT_TYPE_FLYING)) continue;

      const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.rootsAbilityId);
      dummy.issueTargetOrder("entanglingroots", u);
    }
  }
}
