import { Effect, Item, MapPlayer, Timer } from "w3ts/index";
import { Vehicle } from "../../Vehicle";
import { GameMap } from "../../../Game/GameMap";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Group } from "../../../Utility/Group";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";

export class Monsoon extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I004");
  public readonly merchantItemTypeId = FourCC("I00W");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I00Q")];

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
    const playerId = owner.id;
    const area = GameMap.PLAYER_AREAS[playerId];

    const scourgePlayer = MapPlayer.fromIndex(playerId + 9);
    t.start(3, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );

      const grp: Group = Group.fromRectOfPlayer(area, scourgePlayer);
      let hasStruck = false;

      grp.for((u) => {
        if (hasStruck) return;
        if (!u.isAlive()) return;

        hasStruck = true;
        Effect.create(
          "Abilities/Spells/Other/Monsoon/MonsoonBoltTarget.mdl",
          u.x,
          u.y
        ).destroy();
        vehicle.unit.damageTarget(
          u.handle,
          375,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS
        );
      });
      grp.destroy();
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
