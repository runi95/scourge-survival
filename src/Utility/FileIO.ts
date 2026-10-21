// Files in the player's Documents/Warcraft III/CustomMapData. The game only
// writes preload files, which it runs as JASS when they are read, so the data
// breaks out of its Preload string into a call that keeps it in an ability's
// tooltip. Both are local: call them for one player, then sync what was read
// (BlzSendSyncData) before game state depends on it
const ABILITY_ID = FourCC("Amls");

export function writeFile(fileName: string, data: string): void {
  PreloadGenClear();
  PreloadGenStart();
  Preload(`")\ncall BlzSetAbilityTooltip(${ABILITY_ID}, "${data}", 0)\n//`);
  PreloadGenEnd(fileName);
}

export function readFile(fileName: string): string | undefined {
  const original = BlzGetAbilityTooltip(ABILITY_ID, 0);
  BlzSetAbilityTooltip(ABILITY_ID, "", 0);
  Preloader(fileName);
  const data = BlzGetAbilityTooltip(ABILITY_ID, 0);
  BlzSetAbilityTooltip(ABILITY_ID, original, 0);
  return data === "" ? undefined : data;
}
