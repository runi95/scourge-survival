import { Frame, Timer } from "w3ts";
import { GameMap } from "./GameMap";
import { DIFFICULTY_SETUPS } from "./Difficulty";
import { TimerUtils } from "../Utility/TimerUtils";

// The multiboard's rows are 0.013 high and 0.001 apart (the game lays them
// out itself; its frame definitions have no row height)
const ROW_HEIGHT = 0.014;
const ICON_SPACING = 0.0175;
// Player, hero, difficulty, wave and weapons: the first row's widths make
// the board's width, wide enough for a column of upgrade icons for every
// wave. A row's items start 0.001 in and 0.001 apart
const COLUMN_WIDTHS = [0.1, 0.08, 0.055, 0.04, 0.09];
const WEAPON_COLUMN = 4;
const WEAPON_SLOTS = 6;
const WEAPON_ICON_SIZE = 0.012;
const WEAPON_SPACING = 0.0145;
const UPGRADE_ROWS = 4;
const GOLD = "|cffffcc00";
const GREY = "|cff808080";

// One multiboard (the game shows only one): every player, the hero they
// chose, their difficulty, the wave they are on and their weapons (icons
// with the weapon's tooltip on hover), then the scourge's upgrades by wave
export class Scoreboard {
  private readonly upgradeFrames: Frame[][] = [];
  private readonly textFrames: Frame[][] = [];
  // By the player's row, then weapon slot
  private readonly weaponFrames: Frame[][] = [];
  private readonly weaponTextFrames: Frame[][] = [];
  private multiBoard: multiboard;

  constructor() {
    const t: Timer = TimerUtils.newTimer();
    t.start(1, false, () => {
      TimerUtils.releaseTimer(t);
      this.create();
    });
  }

  private create(): void {
    const players = GameMap.ONLINE_PLAYER_ID_LIST;
    // Header, a row a player, the upgrades' label, then their icons
    const upgradeLabelRow = 1 + players.length;
    const rows = upgradeLabelRow + 1 + UPGRADE_ROWS;

    this.multiBoard = CreateMultiboard();
    MultiboardSetTitleText(this.multiBoard, "Scourge Survival");
    MultiboardSetRowCount(this.multiBoard, rows);
    MultiboardSetColumnCount(this.multiBoard, COLUMN_WIDTHS.length);
    MultiboardSetItemsStyle(this.multiBoard, true, false);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLUMN_WIDTHS.length; col++) {
        const item = MultiboardGetItem(this.multiBoard, row, col);
        MultiboardSetItemWidth(item, COLUMN_WIDTHS[col]);
        MultiboardReleaseItem(item);
      }
    }
    this.setText(0, 0, `${GOLD}Player|r`);
    this.setText(0, 1, `${GOLD}Hero|r`);
    this.setText(0, 2, `${GOLD}Difficulty|r`);
    this.setText(0, 3, `${GOLD}Wave|r`);
    this.setText(0, 4, `${GOLD}Weapons|r`);
    this.setText(upgradeLabelRow, 0, `${GOLD}Scourge Upgrades|r`);
    MultiboardMinimize(this.multiBoard, true);
    MultiboardDisplay(this.multiBoard, true);

    const multiboardContainerFrame = Frame.fromName("Multiboard", 0).getChild(
      4,
    );
    let weaponX = 0.001;
    for (let col = 0; col < WEAPON_COLUMN; col++) {
      weaponX += COLUMN_WIDTHS[col] + 0.001;
    }
    for (let k = 0; k < players.length; k++) {
      const icons: Frame[] = [];
      const texts: Frame[] = [];
      for (let slot = 0; slot < WEAPON_SLOTS; slot++) {
        const [icon, text] = this.createIcon(multiboardContainerFrame);
        icon.setSize(WEAPON_ICON_SIZE, WEAPON_ICON_SIZE);
        icon.setPoint(
          FRAMEPOINT_TOPLEFT,
          multiboardContainerFrame,
          FRAMEPOINT_TOPLEFT,
          weaponX + slot * WEAPON_SPACING,
          -0.0045 - (1 + k) * ROW_HEIGHT,
        );
        icon.visible = false;
        icons.push(icon);
        texts.push(text);
      }
      this.weaponFrames.push(icons);
      this.weaponTextFrames.push(texts);
    }
    this.refresh();
    TimerUtils.newTimer().start(0.5, true, () => this.refresh());

    const xOffset = 0.011;
    const yOffset = -0.005 - (upgradeLabelRow + 1) * ROW_HEIGHT;
    for (let x = 0; x < GameMap.WAVES.length; x++) {
      const wave = GameMap.WAVES[x];
      const waveUpgradeFrames: Frame[] = [];
      const waveTextFrames: Frame[] = [];
      for (let y = 0; y < wave.upgrades.length; y++) {
        const waveUpgrade = wave.upgrades[y];
        const [upgradeFrame, textFrame] = this.createIcon(
          multiboardContainerFrame,
        );
        upgradeFrame.setSize(0.013125, 0.013125);
        upgradeFrame.setPoint(
          FRAMEPOINT_TOPLEFT,
          multiboardContainerFrame,
          FRAMEPOINT_TOPLEFT,
          xOffset + x * ICON_SPACING,
          yOffset - y * ICON_SPACING,
        );

        if (x > 0) {
          upgradeFrame.setTexture(
            waveUpgrade.upgrade.icon.replace(
              "CommandButtons/",
              "CommandButtonsDisabled/DIS",
            ),
            0,
            true,
          );
          textFrame.setText(
            `${waveUpgrade.upgrade.name} (${
              waveUpgrade.level
            })|n|n|cff808080(Unlocks after wave ${x})|r|n${waveUpgrade.upgrade.description(
              waveUpgrade.level,
            )}`,
          );
        } else {
          upgradeFrame.setTexture(waveUpgrade.upgrade.icon, 0, true);
          textFrame.setText(
            `${waveUpgrade.upgrade.name} (${
              waveUpgrade.level
            })|n|n${waveUpgrade.upgrade.description(waveUpgrade.level)}`,
          );
        }
        waveUpgradeFrames.push(upgradeFrame);
        waveTextFrames.push(textFrame);
      }

      this.upgradeFrames.push(waveUpgradeFrames);
      this.textFrames.push(waveTextFrames);
    }
  }

  // The players' rows
  private refresh(): void {
    const players = GameMap.ONLINE_PLAYER_ID_LIST;
    for (let k = 0; k < players.length; k++) {
      const playerId = players[k];
      const row = 1 + k;
      const online = GameMap.IS_PLAYER_ID_ONLINE[playerId];
      this.setText(
        row,
        0,
        `|c${GameMap.PLAYER_COLORS[playerId]}${GetPlayerName(Player(playerId))}|r`,
      );

      const hero = GameMap.PLAYER_HEROES[playerId];
      const item = MultiboardGetItem(this.multiBoard, row, 1);
      MultiboardSetItemStyle(item, true, hero != null);
      if (hero != null) MultiboardSetItemIcon(item, hero.icon);
      MultiboardSetItemValue(
        item,
        hero != null ? hero.name : `${GREY}Choosing...|r`,
      );
      MultiboardReleaseItem(item);

      const difficulty = GameMap.PLAYER_DIFFICULTIES[playerId];
      this.setText(
        row,
        2,
        difficulty != null
          ? `|c${DIFFICULTY_SETUPS[difficulty].color}${difficulty}|r`
          : `${GREY}-|r`,
      );

      let wave = `${GameMap.PLAYER_WAVES[playerId]}`;
      if (!online) wave = `${GREY}Left|r`;
      else if (GameMap.IS_PLAYER_VICTORIOUS[playerId]) wave = `${GOLD}Won|r`;
      else if (GameMap.IS_PLAYER_DEFEATED[playerId]) wave = `${GREY}Defeated|r`;
      else if (hero == null) wave = `${GREY}-|r`;
      this.setText(row, 3, wave);

      const vehicleUnit = GameMap.PLAYER_VEHICLES[playerId].unit;
      for (let slot = 0; slot < WEAPON_SLOTS; slot++) {
        const weapon =
          vehicleUnit != null
            ? UnitItemInSlot(vehicleUnit.handle, slot)
            : undefined;
        const icon = this.weaponFrames[k][slot];
        icon.visible = weapon != null;
        if (weapon == null) continue;
        icon.setTexture(BlzGetItemIconPath(weapon), 0, true);
        this.weaponTextFrames[k][slot].setText(
          `${GetItemName(weapon)}|n|n${BlzGetItemExtendedTooltip(weapon)}`,
        );
      }
    }
  }

  // An icon with a tooltip on hover: the icon, and the tooltip's text
  private createIcon(parent: Frame): [Frame, Frame] {
    const icon = Frame.createType("iconFrame", parent, 0, "BACKDROP", "");
    const hover = Frame.createType("UpgradeHoverFrame", icon, 0, "FRAME", "");
    hover.setAllPoints(icon);
    const tooltip = Frame.create("BoxedText", icon, 0, 0);
    const text = Frame.createType("textFrame", tooltip, 0, "TEXT", "");
    text.setSize(0.25, 0);
    tooltip.setPoint(
      FRAMEPOINT_BOTTOMLEFT,
      text,
      FRAMEPOINT_BOTTOMLEFT,
      -0.01,
      -0.01,
    );
    tooltip.setPoint(
      FRAMEPOINT_TOPRIGHT,
      text,
      FRAMEPOINT_TOPRIGHT,
      0.01,
      0.01,
    );
    hover.setTooltip(tooltip);
    text.setPoint(FRAMEPOINT_BOTTOMRIGHT, icon, FRAMEPOINT_TOP, 0, 0.01);
    return [icon, text];
  }

  private setText(row: number, col: number, text: string): void {
    const item = MultiboardGetItem(this.multiBoard, row, col);
    MultiboardSetItemValue(item, text);
    MultiboardReleaseItem(item);
  }

  // Shows the player the upgrades of a wave they have reached
  public unlockWaveUpgrade(playerId: number, waveIndex: number) {
    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;
    if (this.upgradeFrames.length - 1 < waveIndex) return;

    const wave = GameMap.WAVES[waveIndex];
    for (let y = 0; y < wave.upgrades.length; y++) {
      const waveUpgrade = wave.upgrades[y];
      this.upgradeFrames[waveIndex][y].setTexture(
        waveUpgrade.upgrade.icon,
        0,
        true,
      );
      this.textFrames[waveIndex][y].setText(
        `${waveUpgrade.upgrade.name} (${
          waveUpgrade.level
        })|n|n${waveUpgrade.upgrade.description(waveUpgrade.level)}`,
      );
    }
  }
}
