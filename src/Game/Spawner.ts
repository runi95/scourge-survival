import { Effect, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../Utility/TimerUtils";
import { GameMap } from "./GameMap";
import { Creep } from "./Creep";
import { PortalWave } from "./Waves/index";
import { CreepUpgradesFrameSystem } from "./CreepUpgrades/CreepUpgradesFrameSystem";

export class Spawner {
  private readonly gameMap: GameMap;
  private readonly creepUpgradeFrameSystem: CreepUpgradesFrameSystem;

  private waveTimer: Timer;
  private firstPortalTimer: Timer;
  private secondPortalTimer: Timer;
  private readonly positionTimer: Timer;
  private readonly attackTimer: Timer;
  private isCreepSpawnerRunning = false;

  private readonly deathTrigger = Trigger.create();
  private readonly dummyUnitTypeId = FourCC("u000");

  constructor(
    gameMap: GameMap,
    creepUpgradeFrameSystem: CreepUpgradesFrameSystem
  ) {
    this.gameMap = gameMap;
    this.creepUpgradeFrameSystem = creepUpgradeFrameSystem;
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
      if (GameMap.REMAINING_PLAYER_CREEPS[creepPlayerId].get(handleId) == null)
        return;
      GameMap.REMAINING_PLAYER_CREEPS[creepPlayerId].delete(handleId);
      const newPlayerCreepCount =
        GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(creepPlayerId) - 1;
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(
        creepPlayerId,
        newPlayerCreepCount
      );
      SetPlayerState(
        Player(creepPlayerId - 9),
        PLAYER_STATE_RESOURCE_FOOD_USED,
        newPlayerCreepCount
      );

      if (newPlayerCreepCount < 1 && !this.isCreepSpawnerRunning) {
        TimerUtils.releaseTimer(this.waveTimer);
        this.startWave();
      }
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      GameMap.REMAINING_PLAYER_CREEPS[GameMap.ONLINE_PLAYER_ID_LIST[i] + 9] =
        new Map<number, Creep>();
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(
        GameMap.ONLINE_PLAYER_ID_LIST[i] + 9,
        0
      );
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
        for (const [_id, creep] of GameMap.REMAINING_PLAYER_CREEPS[
          playerId + 9
        ]) {
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

    const { wave, upgrades } = GameMap.WAVES[GameMap.CURRENT_WAVE++];
    this.creepUpgradeFrameSystem.unlockWaveUpgrade(GameMap.CURRENT_WAVE);
    print(`Wave ${GameMap.CURRENT_WAVE} incoming!`);

    if (wave.before != null) {
      wave.before();
    }

    for (const { upgrade, level } of upgrades) {
      upgrade.apply(level);
    }

    if (GameMap.CURRENT_WAVE > 1) {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        if (GameMap.IS_PLAYER_DEFEATED[i]) continue;

        const player = MapPlayer.fromIndex(i);
        const gold = player.getState(PLAYER_STATE_RESOURCE_GOLD);
        const income = Math.floor(0.1 * gold);
        if (income < 1) continue;

        const upkeepMult =
          100 - player.getState(PLAYER_STATE_GOLD_UPKEEP_RATE) * 0.01;
        const realIncome = Math.floor(income * upkeepMult);
        if (realIncome > 0) {
          player.setState(PLAYER_STATE_RESOURCE_GOLD, gold + realIncome);
        }
        if (GetPlayerId(GetLocalPlayer()) === i) {
          DisplayTextToPlayer(
            GetLocalPlayer(),
            0,
            0,
            `Income: |cffffcc00+${income}|r`
          );
        }
      }
    }

    const [firstPortal, secondPortal] = wave.portals;
    this.spawnPortal(firstPortal, 0, true);
    this.spawnPortal(secondPortal, 0, false);

    const t: Timer = TimerUtils.newTimer();
    this.waveTimer = t;
    t.start(60, false, () => {
      TimerUtils.releaseTimer(t);

      this.isCreepSpawnerRunning = true;

      if (GameMap.WAVES.length > GameMap.CURRENT_WAVE) {
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
    const { delay, unitTypeId, attackImmediately } = portalWaves[index];
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

        const creep = new Creep(scourgeUnit, x, y, count);
        GameMap.REMAINING_PLAYER_CREEPS[playerId + 9].set(
          scourgeUnit.id,
          creep
        );
        const newCreepCount =
          GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(playerId + 9) + 1;
        GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(playerId + 9, newCreepCount);
        SetPlayerState(
          Player(playerId),
          PLAYER_STATE_RESOURCE_FOOD_USED,
          newCreepCount
        );

        if (!attackImmediately) continue;

        const vehicle = this.gameMap.playerVehicles[playerId];
        if (vehicle == null) continue;
        const attackX = vehicle.lastKnownX;
        const attackY = vehicle.lastKnownY;
        creep.attackOrderPosition = [attackX, attackY];
        creep.unit.issueOrderAt(OrderId.Attack, attackX, attackY);
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
