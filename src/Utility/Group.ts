import * as grp from "w3ts/handles/group";
import { MapPlayer, Rectangle, Unit } from "w3ts";
import type { Point } from "w3ts/handles/point";

// TODO: PR to w3ts to add this

export class Group extends grp.Group {
  public for(exp: (u: Unit) => void): void {
    super.for(() => exp(Unit.fromEnum()));
  }

  public static fromHandle(handle: group | undefined): Group | undefined {
    return handle ? this.getObject(handle) : undefined;
  }

  public static fromRectOfPlayer(r: Rectangle, whichPlayer: MapPlayer): Group {
    return Group.fromHandle(
      GetUnitsInRectOfPlayer(r.handle, whichPlayer.handle),
    );
  }

  // Not GetUnitsInRangeOfLocAll: it calls DestroyBoolExpr(null), which breaks
  // every event registered with a null filter (TriggerRegisterAnyUnitEventBJ)
  public static fromRange(radius: number, point: Point): Group {
    const g = CreateGroup();
    GroupEnumUnitsInRangeOfLoc(g, point.handle, radius, null);
    return Group.fromHandle(g);
  }

  public static fromPlayerAndType(player: player, unitId: number): Group {
    return Group.fromHandle(GetUnitsOfPlayerAndTypeId(player, unitId));
  }
}
