import { Trigger } from "w3ts";
import { GameMap } from "../Game/GameMap";
import type { MapPlayer } from "w3ts";
import { Log, LogLevel } from "../lib/Serilog/Serilog";
import { StringSink } from "../lib/Serilog/Sinks/StringSink";
import { GameOptions } from "../Game/GameOptions";
import { FourCCToString } from "./FourCCToString";

const COMMAND_PREFIX = "-";

export class Commands {
  private readonly gameOptions: GameOptions;
  private readonly player: MapPlayer;

  constructor(gameOptions: GameOptions, player: MapPlayer) {
    this.gameOptions = gameOptions;
    this.player = player;

    const trig = Trigger.create();
    trig.addAction(() => this.handleCommand());
    trig.registerPlayerChatEvent(player, "", false);
  }

  private handleCommand(): void {
    const input = GetEventPlayerChatString();
    if (!input.startsWith(COMMAND_PREFIX)) {
      return;
    }
    const parts = input.substring(COMMAND_PREFIX.length).split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.length > 1 ? parts.slice(1) : [];

    switch (command) {
      case "zoom":
      case "cam":
        if (GetLocalPlayer() === this.player.handle) {
          const amount: number = parseInt(args[0]);
          if (!amount) {
            // player.sendMessage(Util.ColourString(COLOUR_CODES[COLOUR.RED], 'Invalid Amount'));
            return;
          }
          SetCameraField(CAMERA_FIELD_TARGET_DISTANCE, amount, 1);
        }
        break;
      case "tilt":
        if (GetLocalPlayer() === this.player.handle) {
          const amount: number = parseInt(args[0]);

          SetCameraField(CAMERA_FIELD_ANGLE_OF_ATTACK, amount, 1);
        }
        break;
    }

    if (!this.gameOptions.isDebugModeEnabled) return;

    switch (command) {
      case "level":
        (() => {
          if (args.length !== 1) return;

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          vehicle.unit.setHeroLevel(Number(args[0]), true);
        })();
        break;
      case "wave":
        (() => {
          if (args.length !== 1) return;
          GameMap.CURRENT_WAVE = Number(args[0]);
        })();
        break;
      case "ability":
        (() => {
          if (args.length !== 1) return;
          const abilityId = FourCC(args[0]);

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          print(abilityId);
          print(`Added ability? ${vehicle.unit.addAbility(abilityId)}`);
        })();
        break;
      case "item":
        (() => {
          if (args.length !== 1) return;

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          vehicle.unit.addItemById(FourCC(args[0]));
        })();
        break;
      case "itemabil":
        (() => {
          if (args.length !== 1) return;

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          const item = vehicle.unit.getItemInSlot(Number(args[0]));
          const abilities = [];
          for (let i = 0; i < 6; i++) {
            const ability = item.getAbilityByIndex(i);
            print(ability);
            if (ability == null) continue;

            // abilities.push(FourCCToString(BlzGetAbilityId(ability)));
            abilities.push(BlzGetAbilityId(ability));
          }

          print(`${item.name} => ${abilities.join(", ")}`);
        })();
        break;
      case "stock":
        (() => {
          if (args.length !== 1) return;

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          print(GetUnitName(vehicle.weaponRecipeShop.handle));
          AddItemToStock(
            vehicle.weaponRecipeShop.handle,
            FourCC(args[0]),
            1,
            1
          );
        })();
        break;
      case "rstock":
        (() => {
          if (args.length !== 1) return;

          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;

          print(GetUnitName(vehicle.weaponRecipeShop.handle));
          RemoveItemFromStock(vehicle.weaponRecipeShop.handle, FourCC(args[0]));
        })();
        break;
      case "hide":
        (() => {
          const vehicle = GameMap.PLAYER_VEHICLES[0];
          if (vehicle.unit == null) return;
          ShowUnit(
            vehicle.weaponRecipeShop.handle,
            IsUnitHidden(vehicle.weaponRecipeShop.handle)
          );
        })();
        break;
      case "debug":
        Log.Init([new StringSink(LogLevel.Debug, print)]);
    }
  }
}
