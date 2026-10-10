import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class SnareMine extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I09M");
  public readonly merchantItemTypeId = FourCC("I09N");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05G")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A042");
  private readonly mineUnitTypeId: number = FourCC("n01B");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const mine = Unit.fromEvent();
      if (mine.typeId !== this.mineUnitTypeId) return;
      const owner = mine.owner;

      const enemies: Unit[] = [];
      const grp = Group.fromRange(400, mine.point);
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
      for (let i = 0; i < 3 && enemies.length > 0; i++) {
        const index = RandomNumberGenerator.random(0, enemies.length - 1);
        const target = enemies[index];
        enemies.splice(index, 1);
        {
          const dummy = Unit.create(owner, this.dummyUnitId, hx, hy);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
          dummy.addAbility(this.abilityId);
          dummy.issueTargetOrder("ensnare", target);
        }
        const source = Unit.create(owner, this.dummyUnitId, hx, hy);
        source.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        source.damageTarget(
          target.handle,
          40,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
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
