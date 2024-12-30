export class Rectangle {
    private readonly _minX: number;
    private readonly _maxX: number;
    private readonly _minY: number;
    private readonly _maxY: number;

    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this._minX = minX;
        this._maxX = maxX;
        this._minY = minY;
        this._maxY = maxY;
    }

    public get centerX() {
        return (this.minX + this.maxX) / 2;
    }

    public get centerY() {
        return (this.minY + this.maxY) / 2;
    }

    public get maxX() {
        return this._maxX;
    }

    public get maxY() {
        return this._maxY;
    }

    public get minX() {
        return this._minX;
    }

    public get minY() {
        return this._minY;
    }

    public destroy() { }
}
