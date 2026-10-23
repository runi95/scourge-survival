import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// The hero burns every enemy close to it, and every enemy burned heats its
// knives. Every 3 seconds a fan of knives releases the heat: every knife cuts
// harder for each enemy burned since the last fan, then the knives cool
export class StokedBlades extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0CI");
  public readonly merchantItemTypeId = FourCC("I0CJ");
  public readonly recipe: number[] = [FourCC("I05R"), FourCC("I005")];

  private readonly timers = new Map<number, Timer>();
  private readonly flames = new Map<number, Effect>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly fanOfKnivesAbilityId: number = FourCC("A048");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    this.flames.set(
      itemId,
      Effect.createAttachment(
        "Abilities/Spells/NightElf/Immolation/ImmolationTarget.mdl",
        vehicle.unit,
        "origin",
      ),
    );

    let heat = 0;
    let elapsed = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      const hero = vehicle.unit;
      const grp = Group.fromRange(220, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        Effect.createAttachment(
          "Abilities/Spells/NightElf/Immolation/ImmolationDamage.mdl",
          u,
          "head",
        ).destroy();
        hero.damageTarget(
          u.handle,
          20,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
        heat = Math.min(heat + 1, 40);
      });
      grp.destroy();

      elapsed++;
      if (elapsed < this.cooldown) return;
      if (this.fan(hero, owner, heat)) {
        elapsed = 0;
        heat = 0;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }
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

    this.flames.get(itemId)?.destroy();
    this.flames.delete(itemId);
  }

  // Flings the fan when an enemy is within 400; every knife cuts 4 harder for
  // each point of heat. The heat waits for the next fan when nobody is near
  private fan(hero: Unit, owner: MapPlayer, heat: number): boolean {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(400, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    if (enemies.length === 0) return false;

    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.fanOfKnivesAbilityId);
    dummy.issueImmediateOrder("fanofknives");
    if (heat === 0) return true;

    Effect.create(
      "Abilities/Spells/Other/Incinerate/FireLordDeathExplode.mdl",
      hero.x,
      hero.y,
    ).destroy();
    for (const u of enemies) {
      dummy.damageTarget(
        u.handle,
        4 * heat,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      Effect.createAttachment(
        "Abilities/Spells/Other/ImmolationRed/ImmolationRedDamage.mdl",
        u,
        "chest",
      ).destroy();
    }
    return true;
  }
}
