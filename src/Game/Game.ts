import { TimerUtils } from "../Utility/TimerUtils";
import { DamageEngine } from "../Utility/DamageEngine/DamageEngine";
import {
  MapPlayer,
  Trigger,
  FogModifier,
  Unit,
  Rectangle,
  Sound,
  Effect,
} from "w3ts";
import { GameMap } from "./GameMap";
import { GameOptions } from "./GameOptions";
import { Debugger } from "./Debugger";
import type { Timer } from "w3ts";
import { Commands } from "../Utility/Commands";
import { VehicleUpgradeSystem } from "./VehicleUpgradeSystem";
import { Vehicle } from "../Vehicles/Vehicle";
import { Spawner } from "./Spawner";
import { Sounds } from "../Utility/Sounds";
import { RandomNumberGenerator } from "../Utility/RandomNumberGenerator";
import { Abilities } from "../Vehicles/Abilities/Abilities";
import { DamageEventController } from "../Utility/DamageEngine/DamageEventController";

export class Game {
  private readonly damageEngine: DamageEngine;
  private readonly gameOptions: GameOptions;
  private readonly debugger: Debugger;
  private readonly commands: Commands;
  private readonly gameMap: GameMap;
  private readonly vehicleUnitTypeId: number = FourCC("H001");
  private readonly zeppelinUnitTypeId: number = FourCC("n004");
  private readonly vehicleUpgradeSystem: VehicleUpgradeSystem;
  private readonly spawner: Spawner;
  private readonly abilities: Abilities;
  private readonly damageEventController: DamageEventController;
  private readonly vehicleDeathTriggers: Trigger[] = [];

  constructor() {
    this.gameOptions = new GameOptions();
    this.debugger = new Debugger(this.gameOptions);
    this.gameMap = new GameMap();
    this.damageEngine = new DamageEngine();
    this.vehicleUpgradeSystem = new VehicleUpgradeSystem(this.gameMap);
    this.spawner = new Spawner(this.gameMap);
    this.abilities = new Abilities(this.gameMap);
    this.damageEventController = new DamageEventController(this.gameMap);
  }

  public start(): void {
    GameMap.PLAYER_AREAS = [
      Rectangle.create(-15232.0, 5248.0, -5504.0, 14976.0), // Red
      Rectangle.create(-4864.0, 5248.0, 4864.0, 14976.0), // Blue
      Rectangle.create(5504.0, 5248.0, 15232.0, 14976.0), // Teal

      Rectangle.create(-15232.0, -5120.0, -5504.0, 4608.0), // Purple
      Rectangle.create(-4864.0, -5120.0, -4864.0, 4608.0), // Yellow
      Rectangle.create(5504.0, -5120.0, 15232.0, 4608.0), // Orange

      Rectangle.create(-15232.0, -15488.0, -5504.0, -5760.0), // Green
      Rectangle.create(-4864.0, -15488.0, -4864.0, -5760.0), // Pink
      Rectangle.create(5504.0, -15488.0, 15232.0, -5760.0), // Grey
    ];

    const playerLeavesTrig: Trigger = Trigger.create();
    playerLeavesTrig.addAction(() => {
      const playerId = GetPlayerId(GetTriggerPlayer());
      GameMap.IS_PLAYER_ID_ONLINE[playerId] = false;
      GameMap.IS_PLAYER_DEFEATED[playerId] = true;
      const vehicle = this.gameMap.playerVehicles[playerId];
      if (vehicle != null && vehicle.unit.isAlive()) {
        vehicle.unit.kill();
      }

      DisplayTimedTextToForce(
        bj_FORCE_ALL_PLAYERS,
        5,
        `|c${GameMap.PLAYER_COLORS[playerId]}${GetPlayerName(
          GetTriggerPlayer()
        )}|r has left the game!`
      );
    });

    for (let i = 9; i < 18; i++) {
      const scourgePlayer = MapPlayer.fromIndex(i);
      const fogModifier = FogModifier.fromRect(
        scourgePlayer,
        FOG_OF_WAR_VISIBLE,
        Rectangle.fromHandle(GetPlayableMapRect()),
        false,
        false
      );
      fogModifier.start();

      scourgePlayer.setState(PLAYER_STATE_GIVES_BOUNTY, 1);

      const player = MapPlayer.fromIndex(i - 9);
      scourgePlayer.setAlliance(player, ALLIANCE_PASSIVE, false);
      player.setAlliance(scourgePlayer, ALLIANCE_PASSIVE, false);
    }

    const startOfGameSound = Sound.create(
      Sounds.TREMBLE_MORTALS_AND_DESPAIR_DOOM_HAS_COME,
      false,
      false,
      true,
      10,
      10,
      "DefaultEAXON"
    );
    startOfGameSound.start();

    for (let i = 0; i < bj_MAX_PLAYERS; i++) {
      const player = MapPlayer.fromIndex(i);
      new Commands(this.gameOptions, this.gameMap, player);

      playerLeavesTrig.registerPlayerEvent(player, EVENT_PLAYER_LEAVE);
      if (
        player.slotState === PLAYER_SLOT_STATE_PLAYING &&
        player.controller === MAP_CONTROL_USER
      ) {
        GameMap.ONLINE_PLAYER_ID_LIST.push(i);
        GameMap.IS_PLAYER_ID_ONLINE.push(true);
        GameMap.IS_PLAYER_DEFEATED.push(false);

        // const fogModifier = FogModifier.fromRect(
        //   player,
        //   FOG_OF_WAR_VISIBLE,
        //   GameMap.PLAYER_AREAS[i],
        //   false,
        //   false
        // );
        // fogModifier.start();

        player.setState(PLAYER_STATE_RESOURCE_GOLD, 200);

        const x = GameMap.PLAYER_AREAS[i].minX + 200;
        const y = GameMap.PLAYER_AREAS[i].maxY - 200;
        const vehicleUnit = Unit.create(
          player,
          this.vehicleUnitTypeId,
          x,
          y,
          315.0
        );
        vehicleUnit.addItemById(FourCC("I000"));

        vehicleUnit.disableAbility(FourCC("A004"), true, true);
        vehicleUnit.disableAbility(FourCC("A006"), true, true);
        vehicleUnit.disableAbility(FourCC("A007"), true, true);
        vehicleUnit.disableAbility(FourCC("A008"), true, true);

        const zeppelinUnit = Unit.create(
          player,
          this.zeppelinUnitTypeId,
          x,
          y,
          315.0
        );
        zeppelinUnit.life = 110;
        zeppelinUnit.disableAbility(FourCC("Adro"), true, true);
        zeppelinUnit.disableAbility(FourCC("Sch3"), false, true);

        const loadTrigger = Trigger.create();
        const playerIndex = i;
        loadTrigger.addAction(() => {
          const transportUnit = GetTransportUnit();
          BlzUnitDisableAbility(transportUnit, FourCC("Aloa"), true, true);

          SetCameraTargetControllerNoZForPlayer(
            player.handle,
            transportUnit,
            0,
            0,
            false
          );
          IssuePointOrder(
            transportUnit,
            "move",
            GameMap.PLAYER_AREAS[playerIndex].centerX,
            GameMap.PLAYER_AREAS[playerIndex].centerY
          );
          BlzUnitDisableAbility(transportUnit, FourCC("Amove"), false, true);
          SelectUnitForPlayerSingle(transportUnit, player.handle);

          loadTrigger.destroy();
        });
        loadTrigger.registerPlayerUnitEvent(
          player,
          EVENT_PLAYER_UNIT_LOADED,
          undefined
        );
        zeppelinUnit.issueTargetOrder("load", vehicleUnit);

        const zeppelinDeathTrigger = Trigger.create();
        zeppelinDeathTrigger.addAction(() => {
          StopCameraForPlayerBJ(player.handle);
          SelectUnitForPlayerSingle(vehicleUnit.handle, player.handle);
          zeppelinDeathTrigger.destroy();
        });
        zeppelinDeathTrigger.registerUnitEvent(zeppelinUnit, EVENT_UNIT_DEATH);

        const vehicle = new Vehicle(vehicleUnit, ["Cannon"]);
        vehicle.upgradeMap.set("Cannon", 1);

        this.gameMap.playerVehicles.push(vehicle);
        GameMap.SELECTED_VEHCILE_MAP.set(vehicleUnit.id, vehicle);

        const playerName = player.name;
        const vehicleDeathTrig = Trigger.create();
        vehicleDeathTrig.addAction(() => {
          GameMap.IS_PLAYER_DEFEATED[playerIndex] = true;
          print(
            `|c${GameMap.PLAYER_COLORS[playerIndex]}${playerName}|r has been defeated!`
          );
        });
        vehicleDeathTrig.registerUnitEvent(vehicleUnit, EVENT_UNIT_DEATH);
        this.vehicleDeathTriggers.push(vehicleDeathTrig);

        let infernoCount = 0;
        const t: Timer = TimerUtils.newTimer();
        t.start(1.5, true, () => {
          Effect.create(
            "Units/Demon/Infernal/InfernalBirth.mdl",
            zeppelinUnit.x + RandomNumberGenerator.random(-400, 400) + 270,
            zeppelinUnit.y + RandomNumberGenerator.random(-400, 400) - 270
          ).destroy();

          if (++infernoCount > 6) {
            TimerUtils.releaseTimer(t);
          }
        });
      } else {
        GameMap.IS_PLAYER_ID_ONLINE.push(false);
        GameMap.IS_PLAYER_DEFEATED.push(true);
        this.gameMap.playerVehicles.push(null);
      }
    }

    const t: Timer = TimerUtils.newTimer();
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
      this.spawner.startWave();
      TimerUtils.releaseTimer(t);
    });
  }
}
