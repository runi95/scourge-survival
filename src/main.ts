import { addScriptHook, W3TS_HOOK } from "w3ts/hooks";
import { Log, LogLevel } from "./lib/Serilog/Serilog";
import { StringSink } from "./lib/Serilog/Sinks/StringSink";
import { Game } from "./Game/Game";
import "./global-overrides";

Log.Init([new StringSink(LogLevel.Information, print)]);

addScriptHook(W3TS_HOOK.MAIN_AFTER, () => {
  xpcall(
    () => {
      BlzLoadTOCFile("war3mapImported/Templates.toc");
      createQuests();
      new Game().start();
    },
    (err) => {
      Log.Fatal(err);
    }
  );
});

function createQuests(): void {}
