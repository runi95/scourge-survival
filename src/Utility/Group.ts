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
      GetUnitsInRectOfPlayer(r.handle, whichPlayer.handle)
    );
  }

  public static fromRange(radius: number, point: Point): Group {
    return Group.fromHandle(GetUnitsInRangeOfLocAll(radius, point.handle));
  }

  public static fromPlayerAndType(player: player, unitId: number): Group {
    return Group.fromHandle(GetUnitsOfPlayerAndTypeId(player, unitId));
  }
}
