import { MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../Utility/TimerUtils";
import { GameMap } from "./GameMap";
import { Creep } from "./Creep";
import { PortalWave } from "./Waves/index";
import { CreepUpgradesFrameSystem } from "./CreepUpgrades/CreepUpgradesFrameSystem";
import { VehicleUpgradeSystem } from "./VehicleUpgradeSystem";

export class Spawner {
  private readonly creepUpgradeFrameSystem: CreepUpgradesFrameSystem;
  private readonly vehicleUpgradeSystem: VehicleUpgradeSystem;

  // By player id: every player has waves of their own
  private readonly waveTimers: (Timer | undefined)[] = [];
  private isWaveTimerPaused = false;
  private readonly positionTimer: Timer;
  private readonly attackTimer: Timer;
  private readonly runningPortals: number[] = [];

  private readonly deathTrigger = Trigger.create();
  private readonly dummyUnitTypeId = FourCC("u000");

  constructor(
    creepUpgradeFrameSystem: CreepUpgradesFrameSystem,
    vehicleUpgradeSystem: VehicleUpgradeSystem,
  ) {
    this.creepUpgradeFrameSystem = creepUpgradeFrameSystem;
    this.vehicleUpgradeSystem = vehicleUpgradeSystem;
    this.positionTimer = TimerUtils.newTimer();
    this.attackTimer = TimerUtils.newTimer();
  }

  // A creep died and no longer counts towards finishing the wave
  private removeCreep(creepUnit: unit): void {
    const creepPlayerId = GetPlayerId(GetOwningPlayer(creepUnit));
    const playerId = creepPlayerId - 9;
    const handleId = GetHandleId(creepUnit);
    const creeps = GameMap.REMAINING_PLAYER_CREEPS[creepPlayerId];
    if (creeps == null || creeps.get(handleId) == null) return;
    GameMap.REMAINING_PLAYER_CREEPS[creepPlayerId].delete(handleId);
    const newPlayerCreepCount =
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(creepPlayerId) - 1;
    GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(
      creepPlayerId,
      newPlayerCreepCount,
    );
    SetPlayerState(
      Player(playerId),
      PLAYER_STATE_RESOURCE_FOOD_USED,
      newPlayerCreepCount,
    );

    if (
      newPlayerCreepCount < 1 &&
      this.runningPortals[playerId] === 0 &&
      this.waveTimers[playerId] != null &&
      !this.isWaveTimerPaused
    ) {
      TimerUtils.releaseTimer(this.waveTimers[playerId]);
      this.waveTimers[playerId] = undefined;
      this.nextWave(playerId);
    }
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

      this.removeCreep(dyingUnit);
    });

    for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
      GameMap.REMAINING_PLAYER_CREEPS[GameMap.ONLINE_PLAYER_ID_LIST[i] + 9] =
        new Map<number, Creep>();
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(
        GameMap.ONLINE_PLAYER_ID_LIST[i] + 9,
        0,
      );
      this.deathTrigger.registerPlayerUnitEvent(
        MapPlayer.fromIndex(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9),
        EVENT_PLAYER_UNIT_DEATH,
        undefined,
      );
    }

    this.positionTimer.start(1, true, () => {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const vehicle = GameMap.PLAYER_VEHICLES[playerId];
        if (vehicle.unit == null) continue;

        const tracked =
          vehicle.isArriving && vehicle.transport != null
            ? vehicle.transport
            : vehicle.unit;
        const { x, y } = tracked;
        vehicle.lastKnownX = x;
        vehicle.lastKnownY = y;
      }
    });

    this.attackTimer.start(0.1, true, () => {
      for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        const playerId = GameMap.ONLINE_PLAYER_ID_LIST[i];
        const vehicle = GameMap.PLAYER_VEHICLES[playerId];
        if (vehicle.unit == null) continue;

        let counter = 0;
        for (const [_id, creep] of GameMap.REMAINING_PLAYER_CREEPS[
          playerId + 9
        ]) {
          if (creep.tauntTarget != null) continue;
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
                Math.pow(creep.attackOrderPosition[1] - vehicle.lastKnownY, 2),
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
  }

  // When the player has chosen a difficulty
  public startFirstWave(playerId: number) {
    const t: Timer = TimerUtils.newTimer();
    this.waveTimers[playerId] = t;
    t.start(1, false, () => {
      if (GetPlayerId(GetLocalPlayer()) === playerId) {
        const playerArea = GameMap.PLAYER_AREAS[playerId];
        PingMinimapEx(
          playerArea.minX + 640,
          playerArea.maxY - 640,
          4,
          255,
          0,
          0,
          true,
        );
      }
      TimerUtils.releaseTimer(t);
      this.waveTimers[playerId] = undefined;
      this.startWave(playerId);
    });
  }

  public toggleWaveTimerPause(): boolean {
    this.isWaveTimerPaused = !this.isWaveTimerPaused;
    for (const waveTimer of this.waveTimers) {
      if (waveTimer == null) continue;
      if (this.isWaveTimerPaused) {
        waveTimer.pause();
      } else {
        waveTimer.resume();
      }
    }
    return this.isWaveTimerPaused;
  }

  private nextWave(playerId: number) {
    if (GameMap.WAVES.length > GameMap.PLAYER_WAVES[playerId]) {
      this.startWave(playerId);
    } else if (GetPlayerId(GetLocalPlayer()) === playerId) {
      DisplayTextToPlayer(GetLocalPlayer(), 0, 0, "No more waves!");
    }
  }

  private startWave(playerId: number) {
    if (GameMap.IS_PLAYER_DEFEATED[playerId]) return;

    const vehicle = GameMap.PLAYER_VEHICLES[playerId];
    if (vehicle.unit != null) {
      const { x, y } = vehicle.unit;
      vehicle.lastKnownX = x;
      vehicle.lastKnownY = y;
    }

    const waveIndex = GameMap.PLAYER_WAVES[playerId];
    const { wave, upgrades } = GameMap.WAVES[waveIndex];
    if (waveIndex > 0) {
      this.creepUpgradeFrameSystem.unlockWaveUpgrade(playerId, waveIndex);
    }
    const waveNumber = ++GameMap.PLAYER_WAVES[playerId];
    if (GetPlayerId(GetLocalPlayer()) === playerId) {
      DisplayTextToPlayer(
        GetLocalPlayer(),
        0,
        0,
        `Wave ${waveNumber} incoming!`,
      );
    }

    if (wave.before != null) {
      wave.before(this.vehicleUpgradeSystem, playerId);
    }

    const scourgePlayer = MapPlayer.fromIndex(playerId + 9);
    for (const { upgrade, level } of upgrades) {
      upgrade.apply(level, scourgePlayer);
    }

    if (waveNumber > 1) {
      this.payIncome(playerId);
    }

    const [firstPortal, secondPortal] = wave.portals;
    this.runningPortals[playerId] = 0;
    this.spawnPortal(playerId, firstPortal, 0, true);
    this.spawnPortal(playerId, secondPortal, 0, false);

    const t: Timer = TimerUtils.newTimer();
    this.waveTimers[playerId] = t;
    if (this.isWaveTimerPaused) t.pause();
    t.start(60, false, () => {
      TimerUtils.releaseTimer(t);
      this.waveTimers[playerId] = undefined;
      this.nextWave(playerId);
    });
  }

  private payIncome(playerId: number) {
    const player = MapPlayer.fromIndex(playerId);
    const gold = player.getState(PLAYER_STATE_RESOURCE_GOLD);
    const income = Math.floor(0.1 * gold);
    if (income < 1) return;

    const upkeepMult =
      (100 - player.getState(PLAYER_STATE_GOLD_UPKEEP_RATE)) * 0.01;
    const realIncome = Math.floor(income * upkeepMult);
    if (realIncome < 1) return;

    player.setState(PLAYER_STATE_RESOURCE_GOLD, gold + realIncome);
    if (GetPlayerId(GetLocalPlayer()) === playerId) {
      DisplayTextToPlayer(
        GetLocalPlayer(),
        0,
        0,
        `Income: |cffffcc00+${realIncome}|r`,
      );
    }
  }

  private spawnPortal(
    playerId: number,
    portalWaves: PortalWave[],
    index: number,
    isFirstPortal: boolean,
  ) {
    if (portalWaves.length === 0) return;
    if (index === 0) this.runningPortals[playerId]++;
    let { count } = portalWaves[index];
    const { delay, unitTypeId, attackImmediately } = portalWaves[index];
    const t: Timer = TimerUtils.newTimer();
    t.start(delay, true, () => {
      if (GameMap.IS_PLAYER_DEFEATED[playerId]) {
        TimerUtils.releaseTimer(t);
        return;
      }

      const scourgePlayer = MapPlayer.fromIndex(playerId + 9);
      const x = isFirstPortal
        ? GameMap.PLAYER_AREAS[playerId].minX + 640
        : GameMap.PLAYER_AREAS[playerId].maxX - 640;
      const y = isFirstPortal
        ? GameMap.PLAYER_AREAS[playerId].maxY - 640
        : GameMap.PLAYER_AREAS[playerId].minY + 640;
      const scourgeUnit = Unit.create(
        scourgePlayer,
        unitTypeId,
        x,
        y,
        isFirstPortal ? 315.0 : 135.0,
      );

      const creep = new Creep(scourgeUnit, x, y, count);
      GameMap.REMAINING_PLAYER_CREEPS[playerId + 9].set(scourgeUnit.id, creep);
      const newCreepCount =
        GameMap.REMAINING_PLAYER_CREEPS_COUNT.get(playerId + 9) + 1;
      GameMap.REMAINING_PLAYER_CREEPS_COUNT.set(playerId + 9, newCreepCount);
      SetPlayerState(
        Player(playerId),
        PLAYER_STATE_RESOURCE_FOOD_USED,
        newCreepCount,
      );

      if (attackImmediately) {
        const vehicle = GameMap.PLAYER_VEHICLES[playerId];
        const attackX = vehicle.lastKnownX;
        const attackY = vehicle.lastKnownY;
        creep.attackOrderPosition = [attackX, attackY];
        creep.unit.issueOrderAt(OrderId.Attack, attackX, attackY);
      }

      if (--count <= 0) {
        TimerUtils.releaseTimer(t);
        if (portalWaves.length - 1 > index) {
          this.spawnPortal(playerId, portalWaves, index + 1, isFirstPortal);
        } else {
          this.runningPortals[playerId]--;
        }

        // } else {
        //   for (let i = 0; i < GameMap.ONLINE_PLAYER_ID_LIST.length; i++) {
        //     CommandAI(Player(GameMap.ONLINE_PLAYER_ID_LIST[i] + 9), 0, 0);
        //   }
      }
    });
  }
}
