import { Frame, MapPlayer, Trigger } from "w3ts";
import { GameMap } from "./GameMap";
import { Difficulty, DIFFICULTIES, DIFFICULTY_SETUPS } from "./Difficulty";
import { loadCompleted, saveCompleted } from "./DifficultyProgress";
import { MAX_HEROES, RACE_SETUPS } from "./Race";

const SYNC_PREFIX = "ssprogress";
const HERO_ICON_SIZE = 0.04;
const HERO_SPACING = 0.06;

// Every player picks a hero of their race and a difficulty for their own
// scourge when the game starts. Picking the difficulty sends the hero off and
// starts their first wave. A difficulty unlocks once the one before it has
// been completed, which is saved for the player's next games
export class GameSetupSystem {
  private readonly menu: Frame;
  private readonly heroIcons: Frame[] = [];
  private readonly heroNames: Frame[] = [];
  private readonly heroHighlight: Frame;
  private readonly buttons: Frame[] = [];
  private readonly descriptions: Frame[] = [];
  private readonly waiting = new Set<number>();
  // By player id: the hero picked, an index into their race's heroes
  private readonly heroes: number[] = [];
  // By player id: the hardest difficulty completed (an index into
  // DIFFICULTIES), synced from the player's file
  private readonly completed: number[] = [];
  private readonly onChosen: (
    this: void,
    playerId: number,
    heroIndex: number,
  ) => void;

  constructor(
    onChosen: (this: void, playerId: number, heroIndex: number) => void,
  ) {
    this.onChosen = onChosen;

    const gameUi = Frame.fromOrigin(ORIGIN_FRAME_GAME_UI, 0);
    this.menu = Frame.create("EscMenuBackdrop", gameUi, -1, 0);
    this.menu.setSize(0.36, 0.36);
    this.menu.setAbsPoint(FRAMEPOINT_CENTER, 0.4, 0.36);

    const heroTitle = Frame.createType(
      "heroTitleFrame",
      this.menu,
      0,
      "TEXT",
      "",
    );
    heroTitle.setPoint(FRAMEPOINT_TOP, this.menu, FRAMEPOINT_TOP, 0, -0.03);
    heroTitle.setText("|cffffcc00Choose your hero|r");

    // As many slots as the race with the most heroes, filled in for the
    // local player's race
    for (let i = 0; i < MAX_HEROES; i++) {
      // (a copy for the click: TSTL loops share one i)
      const heroIndex = i;
      const icon = Frame.createType("heroIcon", this.menu, i, "BACKDROP", "");
      icon.setSize(HERO_ICON_SIZE, HERO_ICON_SIZE);
      this.heroIcons.push(icon);

      const name = Frame.createType("heroName", icon, i, "TEXT", "");
      name.setPoint(FRAMEPOINT_TOP, icon, FRAMEPOINT_BOTTOM, 0, -0.004);
      this.heroNames.push(name);

      const button = Frame.createType("heroButton", icon, i, "BUTTON", "");
      button.setAllPoints(icon);
      const trig = Trigger.create();
      trig.addAction(() => {
        button.setEnabled(false);
        button.setEnabled(true);
        this.pickHero(MapPlayer.fromEvent().id, heroIndex);
      });
      trig.triggerRegisterFrameEvent(button, FRAMEEVENT_CONTROL_CLICK);
    }

    // The glow of a selected button. A sprite draws from its bottom left
    // corner, so it sits on the icon's
    this.heroHighlight = Frame.createType(
      "heroHighlight",
      this.menu,
      0,
      "SPRITE",
      "",
    );
    this.heroHighlight.setSize(HERO_ICON_SIZE, HERO_ICON_SIZE);
    this.heroHighlight.setModel("UI/Feedback/Autocast/UI-ModalButtonOn.mdx", 0);

    const difficultyTitle = Frame.createType(
      "difficultyTitleFrame",
      this.menu,
      0,
      "TEXT",
      "",
    );
    difficultyTitle.setPoint(
      FRAMEPOINT_TOP,
      this.menu,
      FRAMEPOINT_TOP,
      0,
      -0.135,
    );
    difficultyTitle.setText("|cffffcc00Choose your difficulty|r");

    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const index = i;
      const difficulty = DIFFICULTIES[i];
      const setup = DIFFICULTY_SETUPS[difficulty];

      const button = Frame.create("ScriptDialogButton", this.menu, 0, i);
      button.setSize(0.1, 0.035);
      button.setPoint(
        FRAMEPOINT_TOPLEFT,
        this.menu,
        FRAMEPOINT_TOPLEFT,
        0.03,
        -0.16 - i * 0.045,
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
        button.setEnabled(
          this.isUnlocked(GetPlayerId(GetLocalPlayer()), index),
        );
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
      this.heroes[playerId] = 0;
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
      this.refreshHeroes();
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
    const hero = this.heroSetups(playerId)[this.heroes[playerId]];
    print(
      `|c${GameMap.PLAYER_COLORS[playerId]}${GetPlayerName(
        Player(playerId),
      )}|r chose the ${hero.name} on |c${setup.color}${difficulty}|r.`,
    );
    this.onChosen(playerId, this.heroes[playerId]);
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

  // Back to Easy only, in this game and the player's next ones
  public resetProgress(playerId: number): void {
    this.completed[playerId] = -1;
    if (GetPlayerId(GetLocalPlayer()) !== playerId) return;

    saveCompleted(GetPlayerName(GetLocalPlayer()), -1);
    this.refreshLocks();
    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, "Difficulty progress reset.");
  }

  private pickHero(playerId: number, heroIndex: number): void {
    if (!this.waiting.has(playerId)) return;
    if (heroIndex >= this.heroSetups(playerId).length) return;

    this.heroes[playerId] = heroIndex;
    if (GetPlayerId(GetLocalPlayer()) === playerId) this.refreshHeroes();
  }

  private heroSetups(playerId: number) {
    return RACE_SETUPS[GameMap.PLAYER_RACES[playerId]].heroes;
  }

  private isUnlocked(playerId: number, index: number): boolean {
    return index <= (this.completed[playerId] ?? -1) + 1;
  }

  // The local player's race's heroes, centred, the picked one highlighted
  private refreshHeroes(): void {
    const localPlayerId = GetPlayerId(GetLocalPlayer());
    const setups = this.heroSetups(localPlayerId);
    for (let i = 0; i < MAX_HEROES; i++) {
      const icon = this.heroIcons[i];
      const setup = setups[i];
      icon.visible = setup != null;
      if (setup == null) continue;

      icon.clearPoints();
      icon.setPoint(
        FRAMEPOINT_TOP,
        this.menu,
        FRAMEPOINT_TOP,
        (i - (setups.length - 1) / 2) * HERO_SPACING,
        -0.05,
      );
      icon.setTexture(setup.icon, 0, true);
      this.heroNames[i].setText(setup.name);
    }

    this.heroHighlight.clearPoints();
    this.heroHighlight.setPoint(
      FRAMEPOINT_BOTTOMLEFT,
      this.heroIcons[this.heroes[localPlayerId] ?? 0],
      FRAMEPOINT_BOTTOMLEFT,
      0,
      0,
    );
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
