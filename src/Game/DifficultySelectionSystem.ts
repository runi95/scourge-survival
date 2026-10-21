import { Frame, MapPlayer, Trigger } from "w3ts";
import { GameMap } from "./GameMap";
import { Difficulty, DIFFICULTIES, DIFFICULTY_SETUPS } from "./Difficulty";
import { loadCompleted, saveCompleted } from "./DifficultyProgress";

const SYNC_PREFIX = "ssprogress";

// Every player picks a difficulty for their own scourge when the game
// starts. Their first wave starts as soon as they have picked. A difficulty
// unlocks once the one before it has been completed, which is saved for the
// player's next games
export class DifficultySelectionSystem {
  private readonly menu: Frame;
  private readonly buttons: Frame[] = [];
  private readonly descriptions: Frame[] = [];
  private readonly waiting = new Set<number>();
  // By player id: the hardest difficulty completed (an index into
  // DIFFICULTIES), synced from the player's file
  private readonly completed: number[] = [];
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
      this.buttons.push(button);

      const description = Frame.createType(
        "descriptionFrame",
        button,
        0,
        "TEXT",
        "",
      );
      description.setSize(0.19, 0);
      description.setPoint(FRAMEPOINT_LEFT, button, FRAMEPOINT_RIGHT, 0.01, 0);
      this.descriptions.push(description);

      const trig = Trigger.create();
      trig.addAction(() => {
        button.setEnabled(false);
        button.setEnabled(this.isUnlocked(GetPlayerId(GetLocalPlayer()), i));
        this.choose(MapPlayer.fromEvent().id, difficulty);
      });
      trig.triggerRegisterFrameEvent(button, FRAMEEVENT_CONTROL_CLICK);
    }

    this.refreshLocks();
    this.menu.setVisible(false);
  }

  // Once the online players are known
  public show(): void {
    const syncTrig = Trigger.create();
    syncTrig.addAction(() => {
      const playerId = GetPlayerId(GetTriggerPlayer());
      const completed = Number(BlzGetTriggerSyncData());
      this.completed[playerId] =
        completed === Math.floor(completed) &&
        completed >= -1 &&
        completed < DIFFICULTIES.length
          ? completed
          : -1;
      if (GetPlayerId(GetLocalPlayer()) === playerId) this.refreshLocks();
    });

    for (const playerId of GameMap.ONLINE_PLAYER_ID_LIST) {
      this.waiting.add(playerId);
      BlzTriggerRegisterPlayerSyncEvent(
        syncTrig.handle,
        Player(playerId),
        SYNC_PREFIX,
        false,
      );
    }

    const localPlayerId = GetPlayerId(GetLocalPlayer());
    if (this.waiting.has(localPlayerId)) {
      BlzSendSyncData(
        SYNC_PREFIX,
        `${loadCompleted(GetPlayerName(GetLocalPlayer()))}`,
      );
      this.menu.setVisible(true);
    }
  }

  // Unlocked difficulties only, unless forced (the -difficulty command)
  public choose(playerId: number, difficulty: Difficulty, force = false): void {
    if (!this.waiting.has(playerId)) return;
    if (!force && !this.isUnlocked(playerId, DIFFICULTIES.indexOf(difficulty)))
      return;
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

  // The player has survived every wave: the next difficulty unlocks
  public complete(playerId: number): void {
    const difficulty = GameMap.PLAYER_DIFFICULTIES[playerId];
    if (difficulty == null) return;

    const setup = DIFFICULTY_SETUPS[difficulty];
    print(
      `|c${GameMap.PLAYER_COLORS[playerId]}${GetPlayerName(
        Player(playerId),
      )}|r has survived every wave on |c${setup.color}${difficulty}|r!`,
    );

    const index = DIFFICULTIES.indexOf(difficulty);
    if (index <= (this.completed[playerId] ?? -1)) return;
    this.completed[playerId] = index;

    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;
    saveCompleted(GetPlayerName(GetLocalPlayer()), index);
    const next = DIFFICULTIES[index + 1];
    if (next != null) {
      DisplayTextToPlayer(
        GetLocalPlayer(),
        0,
        0,
        `Unlocked |c${DIFFICULTY_SETUPS[next].color}${next}|r for your next game.`,
      );
    }
  }

  private isUnlocked(playerId: number, index: number): boolean {
    return index <= (this.completed[playerId] ?? -1) + 1;
  }

  // The local player's locks
  private refreshLocks(): void {
    const localPlayerId = GetPlayerId(GetLocalPlayer());
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const unlocked = this.isUnlocked(localPlayerId, i);
      this.buttons[i].setEnabled(unlocked);
      this.descriptions[i].setText(
        unlocked
          ? DIFFICULTY_SETUPS[DIFFICULTIES[i]].description
          : `|cff808080Complete ${DIFFICULTIES[i - 1]} to unlock.|r`,
      );
    }
  }
}
