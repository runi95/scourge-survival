import { MapPlayer } from "w3ts";
import { OrderId } from "w3ts/globals/order";

export class Unit {
    public red: number = 255;
    public green: number = 255;
    public blue: number = 255;
    public alpha: number = 255;
    public order: string | OrderId = OrderId.Stop;
    public orderAtX: number = 0;
    public orderAtY: number = 0;
    public acquireRange: number = 0;
    public exploded: boolean = false;
    public x: number;
    public y: number;

    private static _UNIT_COUNTER: number = 0;

    private readonly _id: number;
    private readonly _owner: MapPlayer | number;
    private readonly _unitId: number;
    private readonly _face: number;
    private readonly _skinId: number | undefined;

    constructor(owner: MapPlayer | number, unitId: number, x: number, y: number, face: number, skinId?: number) {
        this._id = ++Unit._UNIT_COUNTER;
        this._owner = owner;
        this._unitId = unitId;
        this.x = x;
        this.y = y;
        this._face = face;
        this._skinId = skinId;
    }

    public setVertexColor(red: number, green: number, blue: number, alpha: number): void {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    public issueOrderAt(order: string | OrderId, x: number, y: number): boolean {
        this.order = order;
        this.orderAtX = x;
        this.orderAtY = y;

        return true;
    }

    public setExploded(exploded: boolean): void {
        this.exploded = exploded;
    }

    public get id(): number {
        return this._id;
    }

    public static get UNIT_COUNTER(): number {
        return Unit._UNIT_COUNTER;
    }
}
