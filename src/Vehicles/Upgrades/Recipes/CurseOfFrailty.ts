import { Item, MapPlayer } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { CurseOfFrailtyDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/CurseOfFrailtyDamageEvent";

// Every enemy that hits the hero is crippled and takes 150 damage, each one
// at most once every 3 seconds; CurseOfFrailtyDamageEvent does the cursing
export class CurseOfFrailty extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I04U");
  public readonly merchantItemTypeId = FourCC("I04V");
  public readonly recipe: number[] = [FourCC("I04O"), FourCC("I04O")];

  public onAcquire(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    _itemId: number,
    _weaponIndex: number,
  ): void {
    const holders = CurseOfFrailtyDamageEvent.HOLDERS;
    holders.set(owner.id, (holders.get(owner.id) ?? 0) + 1);
  }

  public onDrop(
    _vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    _itemId: number,
    _weaponIndex: number,
  ): void {
    const holders = CurseOfFrailtyDamageEvent.HOLDERS;
    const held = (holders.get(owner.id) ?? 0) - 1;
    if (held > 0) holders.set(owner.id, held);
    else holders.delete(owner.id);
  }
}
