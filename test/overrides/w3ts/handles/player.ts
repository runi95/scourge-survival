export class MapPlayer {
    private readonly _index: number;

    private constructor(index: number) {
        this._index = index;
    }

    public static fromIndex(index: number) {
        return new MapPlayer(index);
    }
}
