import { Frame, MapPlayer } from "w3ts/handles";


export const triggers: Trigger[] = [];
export class Trigger {
    public readonly register: any[] = [];
    public readonly actions: (() => void)[] = [];

    constructor() {
        triggers.push(this);
    }

    public registerEnterRegion(whichRegion: region, filter: boolexpr | (() => boolean) | null): event {
        this.register.push({ whichRegion, filter });
    }

    public registerPlayerKeyEvent(whichPlayer: MapPlayer, whichKey: oskeytype, metaKey: number, fireOnKeyDown: boolean) {
        this.register.push({ whichPlayer, whichKey, metaKey, fireOnKeyDown });
    }

    public triggerRegisterFrameEvent(frame: Frame, eventId: frameeventtype) {
        this.register.push({ frame, eventId });
    }

    public addAction(actionFunc: () => void) {
        this.actions.push(actionFunc);
    }

    public exec() {
        this.actions.forEach((action) => action());
    }
}
