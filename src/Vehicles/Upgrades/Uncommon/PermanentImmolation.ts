import { Effect, Item, MapPlayer, Timer } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { WeaponUpgrade } from "../../WeaponUpgrade";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Group } from "../../../Utility/Group";

export class PermanentImmolation extends WeaponUpgrade {
  public readonly name = "Permanent Immolation";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNImmolationOn.blp";
  public readonly cost = 250;
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I005");
  public readonly description = (
    level: number
  ) => `Engulfs your hero in flames that deal damage to nearby enemy units.

Damage: |cffffcc0010|r
Cooldown: |cffffcc001s|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly timers = new Map<number, Timer>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    const { id } = owner;
    t.start(1, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const { point } = vehicle.unit;
      const grp = Group.fromRange(220, point);
      grp.for((u) => {
        if (u.owner.id !== id + 9) return;

        Effect.createAttachment(
          "Abilities/Spells/NightElf/Immolation/ImmolationDamage.mdl",
          u,
          "head"
        ).destroy();
        vehicle.unit.damageTarget(
          u.handle,
          10,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS
        );
      });
    });
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
  }
}
