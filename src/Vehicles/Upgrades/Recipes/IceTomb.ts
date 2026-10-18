import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// The Frost Wyrm's freezing breath entombs the strongest enemy in ice; when
// the tomb breaks it shatters in a Frost Nova that hurts more the mightier
// the enemy inside was
export class IceTomb extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0AI");
  public readonly merchantItemTypeId = FourCC("I0AJ");
  public readonly recipe: number[] = [FourCC("I05M"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly frostNovaAbilityId: number = FourCC("A03B");

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
      let strongest: Unit | undefined;
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!this.isVictim(u, owner)) return;
        if (!u.isVisible(owner)) return;
        if (StunUtils.getFrozenUnit(u.id) != null) return;

        if (strongest != null && u.life <= strongest.life) return;
        strongest = u;
      });
      grp.destroy();

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (strongest != null) this.entomb(owner, strongest);
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

  private entomb(owner: MapPlayer, victim: Unit): void {
    StunUtils.stunUnit(victim.handle, 2);
    const tomb = Effect.createAttachment(
      "Abilities/Spells/Undead/FreezingBreath/FreezingBreathTargetArt.mdl",
      victim,
      "origin",
    );
    const t = TimerUtils.newTimer();
    t.start(2, false, () => {
      TimerUtils.releaseTimer(t);
      tomb.destroy();
      this.shatter(owner, victim);
    });
  }

  // 100 plus 5% of the entombed enemy's life to everything around it,
  // the entombed enemy too, wherever it fell
  private shatter(owner: MapPlayer, victim: Unit): void {
    const { x, y } = victim;
    const damage = 100 + 0.05 * victim.maxLife;
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    if (victim.isAlive()) {
      dummy.addAbility(this.frostNovaAbilityId);
      dummy.issueTargetOrder("frostnova", victim);
    } else {
      Effect.create(
        "Abilities/Spells/Undead/FrostNova/FrostNovaTarget.mdl",
        x,
        y,
      ).destroy();
    }

    const grp = Group.fromRange(300, dummy.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      dummy.damageTarget(
        u.handle,
        damage,
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
    return true;
  }
}
