import { Rectangle } from "w3ts";

export class Region {
    private _rect: Rectangle;
    private readonly _id: number;
    private static _REGION_COUNTER: number = 0;

    constructor() {
        this._id = ++Region._REGION_COUNTER;
    }

    public addRect(rect: Rectangle): void {
        this._rect = rect;
    }

    public get id(): number {
        return this._id;
    }

    public get rect(): Rectangle {
        return this._rect;
    }
}
