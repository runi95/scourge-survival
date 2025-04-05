import { Item, Trigger, Unit } from "w3ts";
import { WeaponUpgrade, WeaponUpgradeI } from "./WeaponUpgrade";
import { vehicleUpgrades } from "./VehicleUpgrades";
import { GameMap } from "../Game/GameMap";
import { LinkedList } from "../Utility/LinkedList";
import { weaponDummyAbilityIds } from "../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "./WeaponUpgradeRecipe";
import { weaponRecipes } from "./WeaponUpgradeRecipes";

export class WeaponUpgradeSystem {
  private readonly playerWeaponIndex: LinkedList<number>[] = [];
  private readonly itemIdToIndex = new Map<number, number>();
  private readonly weaponUpgradesMap = new Map<number, WeaponUpgradeI>();
  private readonly weaponRecipeMap = new Map<number, WeaponUpgradeRecipe[]>();
  private readonly weaponRecipeMerchantItemMap = new Map<
    number,
    WeaponUpgradeRecipe
  >();
  private dropItemTrig: Trigger;
  private acquireItemTrig: Trigger;
  private itemSoldTrig: Trigger;

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

    for (const weaponRecipe of weaponRecipes) {
      for (const ingredient of weaponRecipe.recipe) {
        const arr = this.weaponRecipeMap.get(ingredient) ?? [];
        arr.push(weaponRecipe);
        this.weaponRecipeMap.set(ingredient, arr);
      }

      this.weaponRecipeMerchantItemMap.set(
        weaponRecipe.merchantItemTypeId,
        weaponRecipe
      );
      this.weaponUpgradesMap.set(weaponRecipe.itemTypeId, weaponRecipe);
    }

    this.acquireItemTrig = Trigger.create();
    this.acquireItemTrig.addAction(() => {
      const item = Item.fromEvent();
      const trig = Unit.fromEvent();
      const { typeId } = item;
      const upgrade = this.weaponUpgradesMap.get(typeId);
      if (upgrade == null) return;

      const { owner } = trig;
      const { id: ownerId } = owner;
      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle == null) return;

      vehicle.availableWeaponSlots--;
      vehicle.weapons.add(typeId);

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

      const weaponRecipes = this.weaponRecipeMap.get(typeId);
      if (weaponRecipes != null) {
        for (const weaponRecipe of weaponRecipes) {
          if (!vehicle.availableWeaponRecipes.has(weaponRecipe.itemTypeId)) {
            const equippedRecipeItems: boolean[] = [];
            const { recipe } = weaponRecipe;
            for (let i = 0; i < recipe.length; i++) {
              equippedRecipeItems.push(false);
            }

            let node = vehicle.weapons.getFirst();
            while (node != null) {
              for (let i = 0; i < recipe.length; i++) {
                if (equippedRecipeItems[i]) continue;
                if (node.value === recipe[i]) {
                  equippedRecipeItems[i] = true;
                  break;
                }
              }

              node = node.next;
            }

            let hasAllItems = true;
            for (let i = 0; i < equippedRecipeItems.length; i++) {
              if (equippedRecipeItems[i] === false) {
                hasAllItems = false;
                break;
              }
            }
            if (!hasAllItems) continue;

            vehicle.availableWeaponRecipes.set(
              weaponRecipe.itemTypeId,
              weaponRecipe
            );
            vehicle.weaponRecipeShop.addItemToStock(
              weaponRecipe.merchantItemTypeId,
              1,
              1
            );
          }
        }
      }
    });
    this.acquireItemTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_PICKUP_ITEM);

    this.dropItemTrig = Trigger.create();
    this.dropItemTrig.addAction(() => {
      const item = Item.fromEvent();
      const trig = Unit.fromEvent();
      const { typeId } = item;
      const upgrade = this.weaponUpgradesMap.get(typeId);
      if (upgrade == null) return;

      const { owner } = trig;
      const { id: ownerId } = owner;
      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle == null) return;

      vehicle.availableWeaponSlots++;
      vehicle.weapons.removeItem(typeId);

      const itemId = item.id;
      const weaponCooldownIndex = this.itemIdToIndex.get(itemId);
      if (weaponCooldownIndex == null) return;

      this.playerWeaponIndex[ownerId].add(weaponCooldownIndex);
      this.itemIdToIndex.delete(itemId);
      upgrade.onDrop(vehicle, owner, item, itemId, weaponCooldownIndex);

      const weaponRecipes = this.weaponRecipeMap.get(typeId);
      if (weaponRecipes != null) {
        for (const weaponRecipe of weaponRecipes) {
          if (vehicle.availableWeaponRecipes.has(weaponRecipe.itemTypeId)) {
            const equippedRecipeItems: boolean[] = [];
            const { recipe } = weaponRecipe;
            for (let i = 0; i < recipe.length; i++) {
              equippedRecipeItems.push(false);
            }

            let node = vehicle.weapons.getFirst();
            while (node != null) {
              for (let i = 0; i < recipe.length; i++) {
                if (equippedRecipeItems[i]) continue;
                if (node.value === recipe[i]) {
                  equippedRecipeItems[i] = true;
                  break;
                }
              }

              node = node.next;
            }

            let hasAllItems = true;
            for (let i = 0; i < equippedRecipeItems.length; i++) {
              if (equippedRecipeItems[i] === false) {
                hasAllItems = false;
                break;
              }
            }
            if (hasAllItems) continue;

            vehicle.availableWeaponRecipes.delete(weaponRecipe.itemTypeId);
            vehicle.weaponRecipeShop.removeItemFromStock(
              weaponRecipe.merchantItemTypeId
            );
          }
        }
      }
    });
    this.dropItemTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DROP_ITEM);

    this.itemSoldTrig = Trigger.create();
    this.itemSoldTrig.addAction(() => {
      const item = Item.fromHandle(GetSoldItem());
      const trig = Unit.fromHandle(GetBuyingUnit());

      const { typeId } = item;
      const weaponUpgrade = this.weaponRecipeMerchantItemMap.get(typeId);
      if (weaponUpgrade == null) return;

      const { owner } = trig;
      const { id: ownerId } = owner;
      const vehicle = GameMap.PLAYER_VEHICLES[ownerId];
      if (vehicle == null) return;

      const requiredRecipeItems: boolean[] = [];
      const { recipe } = weaponUpgrade;
      for (let i = 0; i < recipe.length; i++) {
        requiredRecipeItems.push(false);
      }

      const itemsToDestroy: Item[] = [];
      for (let i = 0; i < 6; i++) {
        const itemInSlot = vehicle.unit.getItemInSlot(i);
        if (itemInSlot == null) continue;
        for (let k = 0; k < requiredRecipeItems.length; k++) {
          if (requiredRecipeItems[k]) continue;
          if (itemInSlot.typeId === recipe[k]) {
            requiredRecipeItems[k] = true;
            itemsToDestroy.push(itemInSlot);
            break;
          }
        }
      }

      let hasAllItems = true;
      for (let i = 0; i < requiredRecipeItems.length; i++) {
        if (!requiredRecipeItems[i]) {
          hasAllItems = false;
          break;
        }
      }

      if (!hasAllItems) return;

      for (const itemToDestroy of itemsToDestroy) {
        itemToDestroy.destroy();
      }

      vehicle.unit.addItemById(weaponUpgrade.itemTypeId);
    });
    this.itemSoldTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SELL_ITEM);
  }
}
