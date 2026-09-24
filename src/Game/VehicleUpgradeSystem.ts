import { Frame, Trigger, MapPlayer, Timer } from "w3ts";
import { GameMap } from "./GameMap";
import { RandomNumberGenerator } from "../Utility/RandomNumberGenerator";
import {
  commonUpgrades,
  legendaryUpgrades,
  rareUpgrades,
  uncommonUpgrades,
  vehicleUpgrades,
} from "../Vehicles/VehicleUpgrades";
import { VehicleUpgrade } from "../Vehicles/VehicleUpgrade";
import { VehicleUpgradeRarity } from "../Vehicles/VehicleUpgradeRarity";

const REROLL_COST = 50;
const ICON_SIZE = 0.02625;
const PURCHASE_FLASH_TICKS = 20;

export class VehicleUpgradeSystem {
  private readonly originFrameGameUi: Frame;
  private readonly menu: Frame;
  private readonly upgradeIconBorderFrames: Frame[] = [];
  private readonly upgradeIconFrames: Frame[] = [];
  private readonly upgradeTextFrames: Frame[] = [];
  private readonly upgradeCostFrames: Frame[] = [];
  private readonly purchaseFlashFrames: Frame[] = [];
  // Local-only animation state, never read by game logic
  private readonly purchaseFlashTicksLeft: number[] = [0, 0, 0, 0];
  private readonly upgradeIndexes: number[][] = [];
  private readonly localPlayerId: number = GetPlayerId(GetLocalPlayer());
  private readonly rerollCostFrame: Frame;

  private freeRerolls: number[] = [];

  constructor() {
    this.originFrameGameUi = Frame.fromOrigin(ORIGIN_FRAME_GAME_UI, 0);

    this.menu = Frame.create("EscMenuBackdrop", this.originFrameGameUi, -1, 0);
    this.menu.setSize(0.3, 0.11);
    this.menu.setAbsPoint(FRAMEPOINT_CENTER, 0.4, 0.16);

    for (let i = 0; i < bj_MAX_PLAYERS; i++) {
      this.freeRerolls[i] = 1;
      this.upgradeIndexes[i] = [];
      this.rollUpgrades(i);
    }

    const rerollIconFrame = Frame.createType(
      "iconFrame",
      this.menu,
      0,
      "BACKDROP",
      "",
    );
    rerollIconFrame.setSize(0.02625, 0.02625);
    rerollIconFrame.setPoint(
      FRAMEPOINT_CENTER,
      this.menu,
      FRAMEPOINT_CENTER,
      -0.1,
      0.013,
    );
    rerollIconFrame.setTexture("war3mapImported/Reroll.dds", 0, true);

    this.rerollCostFrame = Frame.createType(
      "costFrame",
      rerollIconFrame,
      0,
      "TEXT",
      "",
    );
    this.rerollCostFrame.setPoint(
      FRAMEPOINT_CENTER,
      rerollIconFrame,
      FRAMEPOINT_CENTER,
      0,
      -0.0196875,
    );
    this.refreshRerollCost();

    const rerollButtonFrame = Frame.createType(
      "buttonFrame",
      rerollIconFrame,
      0,
      "BUTTON",
      "",
    );
    rerollButtonFrame.setAllPoints(rerollIconFrame);
    const rerollTrig: Trigger = Trigger.create();
    rerollTrig.addAction(() => {
      const player = MapPlayer.fromEvent();
      const playerId = player.id;
      const playerCurrentGold = player.getState(PLAYER_STATE_RESOURCE_GOLD);
      rerollButtonFrame.setEnabled(false);
      rerollButtonFrame.setEnabled(true);
      if (this.freeRerolls[playerId] > 0) {
        this.freeRerolls[playerId]--;
        this.refreshRerollCost();
      } else if (playerCurrentGold < REROLL_COST) {
        return;
      } else {
        player.setState(
          PLAYER_STATE_RESOURCE_GOLD,
          playerCurrentGold - REROLL_COST,
        );
      }

      this.rollUpgrades(playerId);
      this.refreshUpgradeIcons();
    });
    rerollTrig.triggerRegisterFrameEvent(
      rerollButtonFrame,
      FRAMEEVENT_CONTROL_CLICK,
    );

    for (let i = 0; i < 4; i++) {
      const { icon, borderIcon, text, costColor, cost } =
        this.getUpgradeData(i);
      const [upgradeIconFrame, upgradeIconBorderFrame, upgradeCostFrame] =
        this.createUpgradeIconFrame(
          this.menu,
          -0.05 + i * 0.046875,
          0.013,
          costColor,
          cost,
          icon,
          borderIcon,
        );

      this.upgradeIconFrames.push(upgradeIconFrame);
      this.upgradeIconBorderFrames.push(upgradeIconBorderFrame);
      this.upgradeCostFrames.push(upgradeCostFrame);
      const [buttonFrame, textFrame] =
        this.createUpgradeButtonFrame(upgradeIconFrame);
      this.upgradeTextFrames.push(textFrame);
      this.createUpgradeButtonTrigger(buttonFrame, i);
      textFrame.setText(text);
      this.purchaseFlashFrames.push(
        this.createPurchaseFlashFrame(this.menu, upgradeIconFrame),
      );
    }

    Timer.create().start(0.02, true, () => this.updatePurchaseFlashes());

    this.menu.setFocus(false);
  }

  public addFreeRerolls(playerId: number, count: number) {
    this.freeRerolls[playerId] += count;
    this.refreshRerollCost();
  }

  private refreshRerollCost() {
    const freeRerolls = this.freeRerolls[this.localPlayerId] ?? 0;
    const cost =
      freeRerolls > 0 ? `${freeRerolls} free` : REROLL_COST.toString();
    this.rerollCostFrame.setText(`|cffffcc00${cost}|r`);
  }

  private getUpgradeData(iconIndex: number) {
    const upgrade =
      vehicleUpgrades[this.upgradeIndexes[this.localPlayerId][iconIndex]];
    let icon = "UI/Widgets/EscMenu/Human/Quest-Unknown.dds";
    let borderIcon = "war3mapImported/CommonBorder.dds";
    let text = "";
    let nameColor = "|cFFFFFFFF";
    let costColor = "|cFFFFCC00";
    let cost: number | string = 0;
    if (upgrade == null) return { icon, borderIcon, text, costColor, cost };

    icon = upgrade.icon;
    cost = upgrade.cost;
    const vehicle = GameMap.PLAYER_VEHICLES[this.localPlayerId];
    const level = vehicle?.upgradeMap.get(upgrade.name) ?? 0;
    if (upgrade.maxLevel != null) {
      if (level >= upgrade.maxLevel) {
        costColor = "|cFFC3DBFF";
        cost = "MAX";
      } else if (
        upgrade.isWeapon &&
        vehicle != null &&
        vehicle.availableWeaponSlots < 1
      ) {
        costColor = "|cFFC3DBFF";
        cost = "FULL";
      }
    }

    switch (upgrade.rarity) {
      case VehicleUpgradeRarity.UNCOMMON:
        borderIcon = "war3mapImported/UncommonBorder.dds";
        nameColor = "|cFF00FF00";
        break;
      case VehicleUpgradeRarity.RARE:
        borderIcon = "war3mapImported/RareBorder.dds";
        nameColor = "|cFF4080FF";
        break;
      case VehicleUpgradeRarity.LEGENDARY:
        borderIcon = "war3mapImported/LegendaryBorder.dds";
        nameColor = "|cFFFF8040";
        break;
    }

    text =
      `${nameColor}${upgrade.name}|r |cFFFFCC00(${cost})|r|n|n` +
      upgrade.description(level + 1);

    return { icon, borderIcon, text, costColor, cost };
  }

  private refreshUpgradeIcon(iconIndex: number) {
    const { icon, borderIcon, text, costColor, cost } =
      this.getUpgradeData(iconIndex);
    this.upgradeIconFrames[iconIndex].setTexture(icon, 0, true);
    this.upgradeIconBorderFrames[iconIndex].setTexture(borderIcon, 0, true);
    this.upgradeTextFrames[iconIndex].setText(text);
    this.upgradeCostFrames[iconIndex].setText(`${costColor}${cost}|r`);
  }

  private refreshUpgradeIcons() {
    for (let i = 0; i < 4; i++) {
      this.refreshUpgradeIcon(i);
    }
  }

  private shuffleUpgradeArray(arr: number[]): number[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = RandomNumberGenerator.random(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  private getShuffledUpgradeArrays(
    upgradeIndexesToSkip?: Map<number, boolean>,
  ): [number[], number[], number[], number[]] {
    const availableCommonUpgrades = [];
    for (let i = 0; i < commonUpgrades.length; i++) {
      if (upgradeIndexesToSkip?.has(i)) continue;
      availableCommonUpgrades.push(i);
    }
    this.shuffleUpgradeArray(availableCommonUpgrades);

    const availableUncommonUpgrades = [];
    for (let i = 0; i < uncommonUpgrades.length; i++) {
      const index = i + commonUpgrades.length;
      if (upgradeIndexesToSkip?.has(index)) continue;
      availableUncommonUpgrades.push(index);
    }
    this.shuffleUpgradeArray(availableUncommonUpgrades);

    const availableRareUpgrades = [];
    for (let i = 0; i < rareUpgrades.length; i++) {
      const index = i + commonUpgrades.length + uncommonUpgrades.length;
      if (upgradeIndexesToSkip?.has(index)) continue;
      availableRareUpgrades.push(index);
    }
    this.shuffleUpgradeArray(availableRareUpgrades);

    const availableLegendaryUpgrades = [];
    for (let i = 0; i < legendaryUpgrades.length; i++) {
      const index =
        i +
        commonUpgrades.length +
        uncommonUpgrades.length +
        rareUpgrades.length;
      if (upgradeIndexesToSkip?.has(index)) continue;
      availableLegendaryUpgrades.push(index);
    }
    this.shuffleUpgradeArray(availableLegendaryUpgrades);

    return [
      availableCommonUpgrades,
      availableUncommonUpgrades,
      availableRareUpgrades,
      availableLegendaryUpgrades,
    ];
  }

  private rollUpgrade(
    playerId: number,
    index: number,
    availableCommonUpgrades: number[],
    availableUncommonUpgrades: number[],
    availableRareUpgrades: number[],
    availableLegendaryUpgrades: number[],
  ) {
    const rarity = RandomNumberGenerator.random(1, 100);
    if (rarity <= 70) {
      this.upgradeIndexes[playerId][index] =
        availableCommonUpgrades[
          Math.min(index, availableCommonUpgrades.length - 1)
        ];
    } else if (rarity <= 92) {
      this.upgradeIndexes[playerId][index] =
        availableUncommonUpgrades[
          Math.min(index, availableUncommonUpgrades.length - 1)
        ];
    } else if (rarity <= 97) {
      this.upgradeIndexes[playerId][index] =
        availableRareUpgrades[
          Math.min(index, availableRareUpgrades.length - 1)
        ];
    } else {
      this.upgradeIndexes[playerId][index] =
        availableLegendaryUpgrades[
          Math.min(index, availableLegendaryUpgrades.length - 1)
        ];
    }
  }

  private rollUpgrades(playerId: number) {
    const [
      availableCommonUpgrades,
      availableUncommonUpgrades,
      availableRareUpgrades,
      availableLegendaryUpgrades,
    ] = this.getShuffledUpgradeArrays();

    for (let i = 0; i < 4; i++) {
      this.rollUpgrade(
        playerId,
        i,
        availableCommonUpgrades,
        availableUncommonUpgrades,
        availableRareUpgrades,
        availableLegendaryUpgrades,
      );
    }
  }

  private createUpgradeIconFrame(
    parent: Frame,
    offsetX: number,
    offsetY: number,
    costColor: string = "|cFFFFCC00",
    cost: number | string = 0,
    texture = "UI/Widgets/EscMenu/Human/Quest-Unknown.dds",
    borderTexture = "war3mapImported/CommonBorder.dds",
  ): [Frame, Frame, Frame] {
    const iconFrame = Frame.createType("iconFrame", parent, 0, "BACKDROP", "");
    iconFrame.setSize(ICON_SIZE, ICON_SIZE);
    iconFrame.setPoint(
      FRAMEPOINT_CENTER,
      parent,
      FRAMEPOINT_CENTER,
      offsetX,
      offsetY,
    );
    iconFrame.setTexture(texture, 0, true);

    const iconBorderFrame = Frame.createType(
      "iconBorderFrame",
      parent,
      0,
      "BACKDROP",
      "",
    );
    iconBorderFrame.setSize(ICON_SIZE, ICON_SIZE);
    iconBorderFrame.setPoint(
      FRAMEPOINT_CENTER,
      parent,
      FRAMEPOINT_CENTER,
      offsetX,
      offsetY,
    );
    iconBorderFrame.setTexture(borderTexture, 0, true);

    const costFrame = Frame.createType("costFrame", iconFrame, 0, "TEXT", "");
    costFrame.setPoint(
      FRAMEPOINT_CENTER,
      iconFrame,
      FRAMEPOINT_CENTER,
      0,
      -0.0196875,
    );
    costFrame.setText(`${costColor}${cost}|r`);

    return [iconFrame, iconBorderFrame, costFrame];
  }

  private createPurchaseFlashFrame(parent: Frame, iconFrame: Frame): Frame {
    const flashFrame = Frame.createType(
      "purchaseFlashFrame",
      parent,
      0,
      "BACKDROP",
      "",
    );
    flashFrame.setPoint(FRAMEPOINT_CENTER, iconFrame, FRAMEPOINT_CENTER, 0, 0);
    flashFrame.setSize(ICON_SIZE, ICON_SIZE);
    flashFrame.setTexture(
      "UI/Widgets/Console/Human/CommandButton/human-activebutton.blp",
      0,
      true,
    );
    flashFrame.visible = false;

    return flashFrame;
  }

  private updatePurchaseFlashes() {
    for (let i = 0; i < 4; i++) {
      if (this.purchaseFlashTicksLeft[i] <= 0) continue;

      this.purchaseFlashTicksLeft[i]--;
      const progress = this.purchaseFlashTicksLeft[i] / PURCHASE_FLASH_TICKS;
      const size = ICON_SIZE * (1 + 0.3 * progress);
      this.upgradeIconFrames[i].setSize(size, size);
      this.upgradeIconBorderFrames[i].setSize(size, size);
      this.purchaseFlashFrames[i].setSize(size, size);
      this.purchaseFlashFrames[i].setAlpha(Math.floor(255 * progress));
      this.purchaseFlashFrames[i].visible = progress > 0;
    }
  }

  private playPurchaseEffect(playerId: number, index: number) {
    const vehicle = GameMap.PLAYER_VEHICLES[playerId];
    if (vehicle?.unit != null) {
      DestroyEffect(
        AddSpecialEffectTarget(
          "Abilities/Spells/Items/AIlm/AIlmTarget.mdl",
          vehicle.unit.handle,
          "origin",
        ),
      );
    }

    if (playerId === this.localPlayerId) {
      this.purchaseFlashTicksLeft[index] = PURCHASE_FLASH_TICKS;
    }
  }

  private createUpgradeButtonFrame(parent: Frame): [Frame, Frame] {
    const buttonFrame = Frame.createType(
      "buttonFrame",
      parent,
      0,
      "BUTTON",
      "",
    );
    buttonFrame.setAllPoints(parent);

    const tooltipFrame = Frame.create("BoxedText", buttonFrame, 0, 0);
    const textFrame = Frame.createType(
      "textFrame",
      tooltipFrame,
      0,
      "TEXT",
      "",
    );
    textFrame.setSize(0.25, 0);
    tooltipFrame.setPoint(
      FRAMEPOINT_BOTTOMLEFT,
      textFrame,
      FRAMEPOINT_BOTTOMLEFT,
      -0.01,
      -0.01,
    );
    tooltipFrame.setPoint(
      FRAMEPOINT_TOPRIGHT,
      textFrame,
      FRAMEPOINT_TOPRIGHT,
      0.01,
      0.01,
    );
    buttonFrame.setTooltip(tooltipFrame);
    textFrame.setPoint(FRAMEPOINT_BOTTOM, buttonFrame, FRAMEPOINT_TOP, 0, 0.01);
    textFrame.enabled = false;

    return [buttonFrame, textFrame];
  }

  private createUpgradeButtonTrigger(buttonFrame: Frame, index: number): void {
    const buttonTrig: Trigger = Trigger.create();
    buttonTrig.addAction(() => {
      const player = MapPlayer.fromEvent();
      const playerCurrentGold = player.getState(PLAYER_STATE_RESOURCE_GOLD);
      buttonFrame.setEnabled(false);
      buttonFrame.setEnabled(true);

      const playerId = player.id;
      const upgrade: VehicleUpgrade =
        vehicleUpgrades[this.upgradeIndexes[playerId][index]];
      if (upgrade == null) return;

      const vehicle = GameMap.PLAYER_VEHICLES[playerId];
      if (vehicle == null) return;

      if (
        upgrade.maxLevel != null &&
        (vehicle.upgradeMap.get(upgrade.name) ?? 0) >= upgrade.maxLevel
      ) {
        return;
      }

      if (upgrade.isWeapon && vehicle.availableWeaponSlots < 1) return;
      if (playerCurrentGold < upgrade.cost) return;

      player.setState(
        PLAYER_STATE_RESOURCE_GOLD,
        playerCurrentGold - upgrade.cost,
      );
      vehicle.upgradeMap.set(
        upgrade.name,
        (vehicle.upgradeMap.get(upgrade.name) ?? 0) + 1,
      );

      const indexesToSkip = new Map<number, boolean>();
      for (let i = 0; i < 4; i++) {
        if (i === index) continue;
        indexesToSkip.set(this.upgradeIndexes[playerId][i], true);
      }

      const [
        availableCommonUpgrades,
        availableUncommonUpgrades,
        availableRareUpgrades,
        availableLegendaryUpgrades,
      ] = this.getShuffledUpgradeArrays(indexesToSkip);
      this.rollUpgrade(
        playerId,
        index,
        availableCommonUpgrades,
        availableUncommonUpgrades,
        availableRareUpgrades,
        availableLegendaryUpgrades,
      );

      this.refreshUpgradeIcon(index);
      this.playPurchaseEffect(playerId, index);
      upgrade.applyUpgrade(vehicle);
    });
    buttonTrig.triggerRegisterFrameEvent(buttonFrame, FRAMEEVENT_CONTROL_CLICK);
  }
}
