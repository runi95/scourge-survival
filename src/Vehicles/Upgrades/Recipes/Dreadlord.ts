import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

// Raises a Dreadlord that fights by the hero's side, and again 10 seconds
// after it falls. Every 3 seconds it scatters into a swarm of bats, flies
// through the largest group near it, biting everything in its path, and
// takes shape again on the far side
export class Dreadlord extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I09W");
  public readonly merchantItemTypeId = FourCC("I09X");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly dreadlords = new Map<number, Unit>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly dreadlordUnitTypeId: number = FourCC("u02H");
  private readonly swarmAbilityId: number = FourCC("A044");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const raise = () => {
      const { x, y } = vehicle.unit;
      Effect.create(
        "Abilities/Spells/Undead/AnimateDead/AnimateDeadTarget.mdl",
        x + 150,
        y,
      ).destroy();
      const dreadlord = Unit.create(
        owner,
        this.dreadlordUnitTypeId,
        x + 150,
        y,
      );
      this.dreadlords.set(itemId, dreadlord);
    };

    let elapsed = 0;
    let fallen = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(1, true, () => {
      elapsed++;
      const dreadlord = this.dreadlords.get(itemId);
      if (dreadlord.isAlive()) {
        if (elapsed % 3 === 0) this.swarm(dreadlord);
        return;
      }

      fallen++;
      if (fallen === 1) {
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }
      if (fallen < this.cooldown) return;
      fallen = 0;
      raise();
    });
    raise();
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);

    this.dreadlords.get(itemId)?.kill();
    this.dreadlords.delete(itemId);
  }

  // Through the largest group within 700, to 200 past its middle
  private swarm(dreadlord: Unit): void {
    const { owner, x, y } = dreadlord;
    const enemies: Unit[] = [];
    const grp = Group.fromRange(700, dreadlord.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();

    let best: Unit | undefined;
    let bestCount = 0;
    for (const candidate of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - candidate.x;
        const dy = other.y - candidate.y;
        if (dx * dx + dy * dy <= 250 * 250) count++;
      }
      if (count <= bestCount) continue;
      best = candidate;
      bestCount = count;
    }
    if (best == null) return;

    const angle = Math.atan2(best.y - y, best.x - x);
    const distance = Math.min(
      800,
      Math.sqrt((best.x - x) * (best.x - x) + (best.y - y) * (best.y - y)) +
        200,
    );
    const toX = x + distance * Math.cos(angle);
    const toY = y + distance * Math.sin(angle);

    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    dummy.addAbility(this.swarmAbilityId);
    dummy.issueOrderAt("carrionswarm", toX, toY);

    Effect.create(
      "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmDamage.mdl",
      x,
      y,
    ).destroy();
    dreadlord.pauseEx(true);
    dreadlord.show = false;
    const t = TimerUtils.newTimer();
    t.start(distance / 1100, false, () => {
      TimerUtils.releaseTimer(t);
      if (!dreadlord.isAlive()) return;

      dreadlord.setPosition(toX, toY);
      dreadlord.facing = (angle * 180) / Math.PI;
      dreadlord.show = true;
      dreadlord.pauseEx(false);
      Effect.create(
        "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmDamage.mdl",
        toX,
        toY,
      ).destroy();
    });
  }
}
