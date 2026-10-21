import { readFile, writeFile } from "../Utility/FileIO";

// The hardest difficulty a player has completed (an index into DIFFICULTIES,
// -1 for none), kept between games. Local to the player it is read for
const FILE_NAME = "ScourgeSurvival\\Progress.pld";

// Ties the file to the player's name, so it cannot just be edited or copied
function checksum(playerName: string, completed: number): number {
  const text = `ScourgeSurvival|${playerName}|${completed}`;
  let hash = 7;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000003;
  }
  return hash;
}

export function loadCompleted(playerName: string): number {
  const data = readFile(FILE_NAME);
  if (data == null) return -1;

  const [completedText, checksumText] = data.split(":");
  const completed = Number(completedText);
  if (completedText == null || checksumText == null) return -1;
  if (completed !== Math.floor(completed) || completed < -1) return -1;
  if (Number(checksumText) !== checksum(playerName, completed)) return -1;
  return completed;
}

export function saveCompleted(playerName: string, completed: number): void {
  writeFile(FILE_NAME, `${completed}:${checksum(playerName, completed)}`);
}
