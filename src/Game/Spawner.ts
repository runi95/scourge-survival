import { Effect, MapPlayer, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../Utility/TimerUtils";
import { GameMap } from "./GameMap";
import {
  Wave,
  PortalWave,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  ELEVEN,
} from "./Waves/index";
import { RandomNumberGenerator } from "../Utility/RandomNumberGenerator";
import { CreepUpgrades } from "./CreepUpgrades/CreepUpgrades";

export class Spawner {
  private readonly creepUpgrades = new CreepUpgrades();
  private readonly gameMap: GameMap;
  private readonly waves: Wave[] = [
    ONE,
    TWO,
    THREE,
    FOUR,
    FIVE,
    SIX,
    SEVEN,
    EIGHT,
    NINE,
    TEN,
    ELEVEN,
  ];
  private currentWaveIndex: number = 0;

  private waveTimer: Timer;
  private firstPortalTimer: Timer;
  private secondPortalTimer: Timer;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public initializeAI() {
    // for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
    //   StartCampaignAI(
    //     Player(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
    //     "war3mapImported/scourge.ai"
    //   );
    // }

    const t: Timer = TimerUtils.newTimer();
    this.waveTimer = t;
    t.start(10, false, () => {
      const localPlayerId = GetPlayerId(GetLocalPlayer());
      PingMinimapEx(
        GameMap.PLAYER_AREAS[localPlayerId].minX + 100,
        GameMap.PLAYER_AREAS[localPlayerId].maxY - 100,
        4,
        255,
        0,
        0,
        true
      );
      PingMinimapEx(
        GameMap.PLAYER_AREAS[localPlayerId].maxX - 100,
        GameMap.PLAYER_AREAS[localPlayerId].minY + 100,
        4,
        255,
        0,
        0,
        true
      );
      this.startWave();
      TimerUtils.releaseTimer(t);
    });
  }

  private startWave() {
    const wave = this.waves[this.currentWaveIndex++];
    const [firstPortal, secondPortal] = wave;
    this.spawnPortal(firstPortal, 0, true);
    this.spawnPortal(secondPortal, 0, false);

    const t: Timer = TimerUtils.newTimer();
    this.waveTimer = t;
    t.start(30, false, () => {
      TimerUtils.releaseTimer(t);

      const creepUpgradeIndex = RandomNumberGenerator.random(
        0,
        this.creepUpgrades.creepUpgradeTypes.length - 1
      );
      const creepUpgrade =
        this.creepUpgrades.creepUpgradeTypes[creepUpgradeIndex];
      creepUpgrade.apply();

      print(
        `|cFFFF0000Creep ${creepUpgrade.name} increased to level ${creepUpgrade.currentLevel}!|r`
      );

      if (this.waves.length > this.currentWaveIndex) {
        this.startWave();
      } else {
        print("No more waves!");
      }
    });
  }

  private spawnPortal(
    portalWaves: PortalWave[],
    index: number,
    isFirstPortal: boolean
  ) {
    let { count } = portalWaves[index];
    const { delay, unitTypeId } = portalWaves[index];
    const t: Timer = TimerUtils.newTimer();
    if (isFirstPortal) {
      this.firstPortalTimer = t;
    } else {
      this.secondPortalTimer = t;
    }
    t.start(delay, true, () => {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        if (GameMap.IS_PLAYER_DEFEATED[i]) continue;
        const scourgePlayer = MapPlayer.fromIndex(i + 9);
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const x = isFirstPortal
          ? GameMap.PLAYER_AREAS[playerId].minX + 150
          : GameMap.PLAYER_AREAS[playerId].maxX - 150;
        const y = isFirstPortal
          ? GameMap.PLAYER_AREAS[playerId].maxY - 150
          : GameMap.PLAYER_AREAS[playerId].minY + 150;
        Effect.create(
          "AbilitiesSpellsDemonDarkPortalDarkPortalTarget.mdl",
          x,
          y
        ).destroy();
        const scourgeUnit = Unit.create(
          scourgePlayer,
          unitTypeId,
          x,
          y,
          isFirstPortal ? 315.0 : 135.0
        );
        scourgeUnit.issueTargetOrder(
          OrderId.Attack,
          this.gameMap.playerVehicles[playerId].unit
        );
      }

      if (--count <= 0) {
        TimerUtils.releaseTimer(t);
        if (portalWaves.length - 1 > index) {
          this.spawnPortal(portalWaves, index + 1, isFirstPortal);
        } else {
          for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
            CommandAI(Player(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9), 0, 0);
          }
        }
      }
    });
  }
}
