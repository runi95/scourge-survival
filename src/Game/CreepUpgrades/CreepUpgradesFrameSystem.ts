import { Frame, Timer } from "w3ts";
import { GameMap } from "../GameMap";
import { TimerUtils } from "../../Utility/TimerUtils";

export class CreepUpgradesFrameSystem {
  private readonly upgradeFrames: Frame[] = [];
  private multiboardFrame: Frame;
  private multiBoard: multiboard;

  constructor() {
    const t: Timer = TimerUtils.newTimer();
    t.start(1, false, () => {
      this.multiBoard = CreateMultiboard();
      MultiboardSetTitleText(this.multiBoard, "Scourge Upgrades");
      MultiboardSetItemsStyle(this.multiBoard, false, false);
      MultiboardSetItemsWidth(this.multiBoard, GameMap.WAVES.length * 0.0175);
      MultiboardSetRowCount(this.multiBoard, 4);
      MultiboardSetColumnCount(this.multiBoard, 1);
      MultiboardDisplay(this.multiBoard, true);

      this.multiboardFrame = Frame.fromName("Multiboard", 0);

      const xOffset = 0.011;
      const yOffset = -0.005;
      const multiboardContainerFrame = this.multiboardFrame.getChild(4);
      for (let x = 0; x < GameMap.WAVES.length; x++) {
        const wave = GameMap.WAVES[x];
        for (let y = 0; y < wave.upgrades.length; y++) {
          const waveUpgrade = wave.upgrades[y];
          const upgradeFrame = Frame.createType(
            "iconFrame",
            multiboardContainerFrame,
            0,
            "BACKDROP",
            ""
          );
          const upgradeHoverFrame = Frame.createType(
            "UpgradeHoverFrame",
            upgradeFrame,
            0,
            "FRAME",
            ""
          );

          upgradeHoverFrame.setAllPoints(upgradeFrame);

          upgradeFrame.setSize(0.013125, 0.013125);
          upgradeFrame.setPoint(
            FRAMEPOINT_TOPLEFT,
            multiboardContainerFrame,
            FRAMEPOINT_TOPLEFT,
            xOffset + x * 0.0175,
            yOffset - y * 0.0175
          );
          upgradeFrame.setTexture(waveUpgrade.upgrade.icon, 0, true);

          const tooltipFrame = Frame.create("BoxedText", upgradeFrame, 0, 0);
          const textFrame = Frame.createType(
            "textFrame",
            tooltipFrame,
            0,
            "TEXT",
            ""
          );
          textFrame.setSize(0.25, 0);

          textFrame.setText(
            `${waveUpgrade.upgrade.name} (${
              waveUpgrade.level
            })|n|n${waveUpgrade.upgrade.description(waveUpgrade.level)}`
          );
          tooltipFrame.setPoint(
            FRAMEPOINT_BOTTOMLEFT,
            textFrame,
            FRAMEPOINT_BOTTOMLEFT,
            -0.01,
            -0.01
          );
          tooltipFrame.setPoint(
            FRAMEPOINT_TOPRIGHT,
            textFrame,
            FRAMEPOINT_TOPRIGHT,
            0.01,
            0.01
          );
          upgradeHoverFrame.setTooltip(tooltipFrame);

          textFrame.setPoint(
            FRAMEPOINT_BOTTOMRIGHT,
            upgradeFrame,
            FRAMEPOINT_TOP,
            0,
            0.01
          );

          this.upgradeFrames.push(upgradeFrame);
        }
      }

      TimerUtils.releaseTimer(t);
    });
  }
}
