import { Frame, MapPlayer, Trigger } from "w3ts";
import { GameMap } from "./GameMap";
import { Difficulty, DIFFICULTIES, DIFFICULTY_SETUPS } from "./Difficulty";

// Every player picks a difficulty for their own scourge when the game
// starts. Their first wave starts as soon as they have picked
export class DifficultySelectionSystem {
  private readonly menu: Frame;
  private readonly waiting = new Set<number>();
  private readonly onChosen: (this: void, playerId: number) => void;

  constructor(onChosen: (this: void, playerId: number) => void) {
    this.onChosen = onChosen;

    const gameUi = Frame.fromOrigin(ORIGIN_FRAME_GAME_UI, 0);
    this.menu = Frame.create("EscMenuBackdrop", gameUi, -1, 0);
    this.menu.setSize(0.36, 0.25);
    this.menu.setAbsPoint(FRAMEPOINT_CENTER, 0.4, 0.37);

    const title = Frame.createType("titleFrame", this.menu, 0, "TEXT", "");
    title.setPoint(FRAMEPOINT_TOP, this.menu, FRAMEPOINT_TOP, 0, -0.03);
    title.setText("|cffffcc00Choose your difficulty|r");

    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const difficulty = DIFFICULTIES[i];
      const setup = DIFFICULTY_SETUPS[difficulty];

      const button = Frame.create("ScriptDialogButton", this.menu, 0, i);
      button.setSize(0.1, 0.035);
      button.setPoint(
        FRAMEPOINT_TOPLEFT,
        this.menu,
        FRAMEPOINT_TOPLEFT,
        0.03,
        -0.055 - i * 0.045,
      );
      button.setText(`|c${setup.color}${difficulty}|r`);

      const description = Frame.createType(
        "descriptionFrame",
        button,
        0,
        "TEXT",
        "",
      );
      description.setSize(0.19, 0);
      description.setPoint(FRAMEPOINT_LEFT, button, FRAMEPOINT_RIGHT, 0.01, 0);
      description.setText(setup.description);

      const trig = Trigger.create();
      trig.addAction(() => {
        button.setEnabled(false);
        button.setEnabled(true);
        this.choose(MapPlayer.fromEvent().id, difficulty);
      });
      trig.triggerRegisterFrameEvent(button, FRAMEEVENT_CONTROL_CLICK);
    }

    this.menu.setVisible(false);
  }

  // Once the online players are known
  public show(): void {
    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      this.waiting.add(playerId);
    }

    if (this.waiting.has(GetPlayerId(GetLocalPlayer()))) {
      this.menu.setVisible(true);
    }
  }

  public choose(playerId: number, difficulty: Difficulty): void {
    if (!this.waiting.has(playerId)) return;
    this.waiting.delete(playerId);

    const setup = DIFFICULTY_SETUPS[difficulty];
    GameMap.PLAYER_DIFFICULTIES[playerId] = difficulty;
    const scourge = MapPlayer.fromIndex(playerId + 9).handle;
    SetPlayerHandicap(scourge, setup.life);
    SetPlayerHandicapDamage(scourge, setup.damage);

    if (GetPlayerId(GetLocalPlayer()) === playerId) {
      this.menu.setVisible(false);
    }
    print(
      `|c${GameMap.PLAYER_COLORS[playerId]}${GetPlayerName(
        Player(playerId),
      )}|r chose |c${setup.color}${difficulty}|r.`,
    );
    this.onChosen(playerId);
  }
}
