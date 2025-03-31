import { Item, Trigger, Unit } from "w3ts";
import { WeaponUpgrade } from "./WeaponUpgrade";
import { vehicleUpgrades } from "./VehicleUpgrades";
import { GameMap } from "../Game/GameMap";
import { LinkedList } from "../Utility/LinkedList";
import { weaponDummyAbilityIds } from "../Utility/WeaponDummyAbilityIds";
import { FourCCToString } from "../Utility/FourCCToString";

export class WeaponUpgradeSystem {
  private readonly playerWeaponIndex: LinkedList<number>[] = [];
  private readonly itemIdToIndex = new Map<number, number>();
  private readonly weaponUpgradesMap = new Map<number, WeaponUpgrade>();
  private dropItemTrig: Trigger;
  private acquireItemTrig: Trigger;

  constructor() {
    for (let i = 0; i < 9; i++) {
      const weaponIndexLinkedList = new LinkedList<number>([0, 1, 2, 3, 4, 5]);
      this.playerWeaponIndex.push(weaponIndexLinkedList);
    }

    for (const vehicleUpgrade of vehicleUpgrades) {
      if (vehicleUpgrade instanceof WeaponUpgrade) {
        this.weaponUpgradesMap.set(vehicleUpgrade.itemTypeId, vehicleUpgrade);
      }
    }

    this.acquireItemTrig = Trigger.create();
    this.acquireItemTrig.addAction(() => {
      const item = Item.fromEvent();
      const trig = Unit.fromEvent();
      const upgrade = this.weaponUpgradesMap.get(item.typeId);
      if (upgrade == null) return;

      const { owner } = trig;
      const { id: ownerId } = owner;
      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle == null) return;

      vehicle.availableWeaponSlots--;

      const weaponCooldownIndex = this.playerWeaponIndex[ownerId].pop();
      const weaponDummyAbilityId =
        weaponDummyAbilityIds[weaponCooldownIndex.value];
      item.addAbility(weaponDummyAbilityId);
      BlzSetAbilityRealLevelField(
        item.getAbility(weaponDummyAbilityId),
        ABILITY_RLF_COOLDOWN,
        0,
        upgrade.cooldown
      );
      BlzSetItemIntegerField(
        item.handle,
        ITEM_IF_COOLDOWN_GROUP,
        weaponDummyAbilityId
      );

      const itemId = item.id;
      this.itemIdToIndex.set(itemId, weaponCooldownIndex.value);
      upgrade.onAcquire(
        vehicle,
        owner,
        item,
        itemId,
        weaponCooldownIndex.value
      );
    });
    this.acquireItemTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_PICKUP_ITEM);

    this.dropItemTrig = Trigger.create();
    this.dropItemTrig.addAction(() => {
      const item = Item.fromEvent();
      const trig = Unit.fromEvent();
      const upgrade = this.weaponUpgradesMap.get(item.typeId);
      if (upgrade == null) return;

      const { owner } = trig;
      const { id: ownerId } = owner;
      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle == null) return;

      vehicle.availableWeaponSlots++;

      const itemId = item.id;
      const weaponCooldownIndex = this.itemIdToIndex.get(itemId);
      if (weaponCooldownIndex == null) return;

      this.playerWeaponIndex[ownerId].add(weaponCooldownIndex);
      this.itemIdToIndex.delete(itemId);
      upgrade.onDrop(vehicle, owner, item, itemId, weaponCooldownIndex);
    });
    this.dropItemTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DROP_ITEM);
  }
}
