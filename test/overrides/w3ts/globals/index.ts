import { MapPlayer } from "w3ts/handles/player";

export * from "./order";
export const Players: MapPlayer[] = [];

for (let i = 0; i < 24; i++) {
    Players[i] = MapPlayer.fromIndex(i);
}

