import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class ShadowTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0E4");
  public readonly merchantItemTypeId = FourCC("I0E5");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A047");
  private readonly mineUnitTypeId: number = FourCC("n01P");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const mine = Unit.fromEvent();
      if (mine.typeId !== this.mineUnitTypeId) return;
      const owner = mine.owner;

      const enemies: Unit[] = [];
      const grp = Group.fromRange(500, mine.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      if (enemies.length === 0) return;

      const hx = mine.x;
      const hy = mine.y;
      for (let i = 0; i < 2 && enemies.length > 0; i++) {
        const index = RandomNumberGenerator.random(0, enemies.length - 1);
        const target = enemies[index];
        enemies.splice(index, 1);
        {
          const dummy = Unit.create(owner, this.dummyUnitId, hx, hy);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
          dummy.addAbility(this.abilityId);
          dummy.issueTargetOrder("shadowstrike", target);
        }
      }
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const mine = Unit.create(
        owner,
        this.mineUnitTypeId,
        vehicle.unit.x,
        vehicle.unit.y,
      );
      mine.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 180);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
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
  }
}
