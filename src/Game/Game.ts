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
import { Spawner } from "./Spawner";
import { Sounds } from "../Utility/Sounds";
import { RandomNumberGenerator } from "../Utility/RandomNumberGenerator";
import { Abilities } from "../Vehicles/Abilities/Abilities";
import { DamageEventController } from "../Utility/DamageEngine/DamageEventController";
import { CreepAbilityController } from "./CreepAbilityController";
import { CreepUpgrades } from "./CreepUpgrades/CreepUpgrades";
import { CreepWaveUpgrade } from "./CreepUpgrades/CreepWaveUpgrade";
import { waves } from "./Waves/index";
import { CreepUpgradesFrameSystem } from "./CreepUpgrades/CreepUpgradesFrameSystem";
import { WeaponUpgradeSystem } from "../Vehicles/WeaponUpgradeSystem";

export class Game {
  private readonly damageEngine = new DamageEngine();
  private readonly gameOptions = new GameOptions();
  private readonly debugger: Debugger;
  private readonly commands: Commands;
  private readonly gameMap = new GameMap();
  private readonly vehicleUnitTypeId: number = FourCC("H001");
  private readonly zeppelinUnitTypeId: number = FourCC("n004");
  private readonly vehicleUpgradeSystem: VehicleUpgradeSystem;
  private readonly spawner: Spawner;
  private readonly abilities: Abilities;
  private readonly damageEventController: DamageEventController;
  private readonly vehicleDeathTriggers: Trigger[] = [];
  private readonly creepAbilityController: CreepAbilityController;
  private readonly creepUpgrades = new CreepUpgrades();
  private readonly creepUpgradesFrameSystem = new CreepUpgradesFrameSystem();
  private readonly weaponUpgradeSystem = new WeaponUpgradeSystem();

  constructor() {
    this.debugger = new Debugger(this.gameOptions);
    this.vehicleUpgradeSystem = new VehicleUpgradeSystem();
    this.spawner = new Spawner(this.creepUpgradesFrameSystem);
    this.abilities = new Abilities();
    this.damageEventController = new DamageEventController();
    this.creepAbilityController = new CreepAbilityController();

    const availableCreepUpgradeIndexes =
      this.creepUpgrades.creepUpgradeTypes.map((_, i) => i);
    const currentUpgradeLevel = availableCreepUpgradeIndexes.map(() => 0);
    const getAvailableUpgradeIndex = () => {
      const availableCreepUpgradeIndex = RandomNumberGenerator.random(
        0,
        availableCreepUpgradeIndexes.length - 1
      );
      const creepUpgradeIndex =
        availableCreepUpgradeIndexes[availableCreepUpgradeIndex];

      if (
        currentUpgradeLevel[creepUpgradeIndex]++ >=
        this.creepUpgrades.creepUpgradeTypes[creepUpgradeIndex].maxLevel
      ) {
        availableCreepUpgradeIndexes.splice(availableCreepUpgradeIndex, 1);
      }

      return creepUpgradeIndex;
    };

    for (const wave of waves) {
      const firstCreepUpgradeIndex = getAvailableUpgradeIndex();
      const upgrades: CreepWaveUpgrade[] = [
        {
          level: currentUpgradeLevel[firstCreepUpgradeIndex],
          upgrade: this.creepUpgrades.creepUpgradeTypes[firstCreepUpgradeIndex],
        },
      ];

      const secondCreepUpgradeIndex = getAvailableUpgradeIndex();
      upgrades.push({
        level: currentUpgradeLevel[secondCreepUpgradeIndex],
        upgrade: this.creepUpgrades.creepUpgradeTypes[secondCreepUpgradeIndex],
      });

      if (wave.bonusUpgrades != null) {
        upgrades.push(
          ...wave.bonusUpgrades.map((upgrade) => ({
            level: 1,
            upgrade,
          }))
        );
      }

      GameMap.WAVES.push({
        wave,
        upgrades,
      });
    }
  }

  public start(): void {
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-14336.0, 6144.0, -6400.0, 14080.0)
    ); // Red
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-5120.0, 6144.0, 2816.0, 14080.0)
    ); // Blue
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(4096.0, 6144.0, 12032.0, 14080.0)
    ); // Teal
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-14336.0, -3072.0, -6400.0, 6144.0)
    ); // Purple
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-5120.0, -3072.0, 2816.0, 6144.0)
    ); // Yellow
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(4096.0, -3072.0, 12032.0, 6144.0)
    ); // Orange
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-14336.0, -12416.0, -6400.0, -4480.0)
    ); // Green
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(-5120.0, -12416.0, 2816.0, -4480.0)
    ); // Pink
    GameMap.PLAYER_AREAS.push(
      Rectangle.create(4096.0, -12416.0, 12032.0, -4480.0)
    ); // Grey

    const playerLeavesTrig: Trigger = Trigger.create();
    playerLeavesTrig.addAction(() => {
      const playerId = GetPlayerId(GetTriggerPlayer());
      GameMap.IS_PLAYER_ID_ONLINE[playerId] = false;
      GameMap.IS_PLAYER_DEFEATED[playerId] = true;
      const vehicle = GameMap.PLAYER_VEHICLES[playerId];
      if (vehicle.unit?.isAlive()) {
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

    const hostilePlayer = MapPlayer.fromIndex(26);
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
      hostilePlayer.setAlliance(scourgePlayer, ALLIANCE_PASSIVE, true);
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

    for (let i = 0; i < 9; i++) {
      const player = MapPlayer.fromIndex(i);
      new Commands(this.gameOptions, player);

      playerLeavesTrig.registerPlayerEvent(player, EVENT_PLAYER_LEAVE);
      if (
        player.slotState === PLAYER_SLOT_STATE_PLAYING &&
        player.controller === MAP_CONTROL_USER
      ) {
        GameMap.ONLINE_PLAYER_ID_LIST.push(i);
        GameMap.IS_PLAYER_ID_ONLINE.push(true);
        GameMap.IS_PLAYER_DEFEATED.push(false);

        player.setState(PLAYER_STATE_RESOURCE_GOLD, 500);

        const x = GameMap.PLAYER_AREAS[i].minX + 700;
        const y = GameMap.PLAYER_AREAS[i].maxY - 700;
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

        const vehicle = GameMap.PLAYER_VEHICLES[i];
        vehicle.unit = vehicleUnit;
        vehicle.upgradeMap.set("Cannon", 1);

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
      }
    }

    this.abilities.initialize();
    this.creepAbilityController.initialize();
    this.spawner.initializeAI();
  }
}
