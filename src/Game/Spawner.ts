import { Effect, MapPlayer, Timer, Trigger, Unit } from "w3ts";
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
  TWELVE,
} from "./Waves/index";
import { RandomNumberGenerator } from "../Utility/RandomNumberGenerator";
import { CreepUpgrades } from "./CreepUpgrades/CreepUpgrades";
import { Creep } from "./Creep";

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
    TWELVE,
  ];
  private currentWaveIndex: number = 0;

  private waveTimer: Timer;
  private firstPortalTimer: Timer;
  private secondPortalTimer: Timer;
  private readonly positionTimer: Timer;
  private readonly attackTimer: Timer;
  private isCreepSpawnerRunning = false;

  private readonly deathTrigger = Trigger.create();
  private readonly unholyAuraUnitTypeId = FourCC("u00C");
  private readonly dummyUnitTypeId = FourCC("u000");
  private readonly remainingPlayerCreeps: Map<number, Creep>[] = [];
  private readonly remainingPlayerCreepsCount: Map<number, number> = new Map();

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.positionTimer = TimerUtils.newTimer();
    this.attackTimer = TimerUtils.newTimer();
  }

  public initializeAI() {
    // for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
    //   StartCampaignAI(
    //     Player(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
    //     "war3mapImported/scourge.ai"
    //   );
    // }

    this.deathTrigger.addAction(() => {
      const dyingUnit = GetTriggerUnit();
      if (dyingUnit == null) return;

      const creepPlayerId = GetPlayerId(GetOwningPlayer(dyingUnit));
      const handleId = GetHandleId(dyingUnit);
      if (this.remainingPlayerCreeps[creepPlayerId].get(handleId) == null)
        return;
      this.remainingPlayerCreeps[creepPlayerId].delete(handleId);
      const newPlayerCreepCount =
        this.remainingPlayerCreepsCount.get(creepPlayerId - 9) - 1;
      this.remainingPlayerCreepsCount.set(
        creepPlayerId - 9,
        newPlayerCreepCount
      );

      if (newPlayerCreepCount < 1 && !this.isCreepSpawnerRunning) {
        TimerUtils.releaseTimer(this.waveTimer);
        this.startWave();
      }
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      this.remainingPlayerCreeps[GameMap.ONLINE_PLAYER_ID_LIST[i] + 9] =
        new Map<number, Creep>();
      this.remainingPlayerCreepsCount.set(GameMap.ONLINE_PLAYER_ID_LIST[i], 0);
      this.deathTrigger.registerPlayerUnitEvent(
        MapPlayer.fromIndex(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
        EVENT_PLAYER_UNIT_DEATH,
        undefined
      );
    }

    this.positionTimer.start(1, true, () => {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const vehicle = this.gameMap.playerVehicles[playerId];
        if (vehicle == null) continue;

        const { x, y } = vehicle.unit;
        vehicle.lastKnownX = x;
        vehicle.lastKnownY = y;
      }
    });

    this.attackTimer.start(0.1, true, () => {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const vehicle = this.gameMap.playerVehicles[playerId];
        if (vehicle == null) continue;

        let counter = 0;
        for (const [_id, creep] of this.remainingPlayerCreeps[playerId + 9]) {
          if (creep.attackOrderPosition == null) {
            if (creep.attackMoveIndex <= 0) {
              creep.attackMoveIndex = 0;
              creep.attackOrderPosition = [creep.spawnX, creep.spawnY];
            } else {
              creep.attackMoveIndex -= 0.1;
              continue;
            }
          } else {
            const dist = Math.sqrt(
              Math.pow(creep.attackOrderPosition[0] - vehicle.lastKnownX, 2) +
                Math.pow(creep.attackOrderPosition[1] - vehicle.lastKnownY, 2)
            );
            if (dist < 500) continue;
          }

          const attackX = vehicle.lastKnownX;
          const attackY = vehicle.lastKnownY;
          creep.attackOrderPosition[0] = attackX;
          creep.attackOrderPosition[1] = attackY;
          creep.unit.issueOrderAt(OrderId.Attack, attackX, attackY);
          if (++counter > 11) break;
        }
      }
    });

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
    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      const vehicle =
        this.gameMap.playerVehicles[GameMap.ONLINE_PLAYER_ID_LIST[i]];
      if (vehicle == null) continue;

      const { x, y } = vehicle.unit;
      vehicle.lastKnownX = x;
      vehicle.lastKnownY = y;
    }

    const wave = this.waves[this.currentWaveIndex++];
    print(`Wave ${this.currentWaveIndex} incoming!`);

    if (wave.before != null) {
      wave.before();
    }

    const [firstPortal, secondPortal] = wave.portals;
    this.spawnPortal(firstPortal, 0, true);
    this.spawnPortal(secondPortal, 0, false);

    const t: Timer = TimerUtils.newTimer();
    this.waveTimer = t;
    t.start(60, false, () => {
      TimerUtils.releaseTimer(t);

      this.isCreepSpawnerRunning = true;
      const creepUpgradeIndex = RandomNumberGenerator.random(
        0,
        this.creepUpgrades.creepUpgradeTypes.length - 1
      );
      const creepUpgrade =
        this.creepUpgrades.creepUpgradeTypes[creepUpgradeIndex];
      creepUpgrade.apply();

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
    if (portalWaves.length === 0) return;
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
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const scourgePlayer = MapPlayer.fromIndex(playerId + 9);
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

        this.remainingPlayerCreeps[playerId + 9].set(
          scourgeUnit.id,
          new Creep(scourgeUnit, x, y, count)
        );
        this.remainingPlayerCreepsCount.set(
          playerId,
          this.remainingPlayerCreepsCount.get(playerId) + 1
        );
      }

      if (--count <= 0) {
        TimerUtils.releaseTimer(t);
        if (portalWaves.length - 1 > index) {
          this.spawnPortal(portalWaves, index + 1, isFirstPortal);
        } else {
          this.isCreepSpawnerRunning = false;
        }

        // } else {
        //   for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        //     CommandAI(Player(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9), 0, 0);
        //   }
      }
    });
  }
}
