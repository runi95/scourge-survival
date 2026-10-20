import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { Globals } from "../../../Utility/Globals";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

export class FrostArmor extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I0B4");
  public readonly merchantItemTypeId = FourCC("I0B5");
  public readonly recipe: number[] = [FourCC("I05K"), FourCC("I041")];

  private readonly timers = new Map<number, Timer>();
  private readonly itemSkeletons = new Map<number, Unit[]>();
  private readonly armored = new Set<number>();
  private readonly skeletonUnitTypeId: number = FourCC("u01M");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly frostArmorAbilityId: number = FourCC("A04Z");
  private readonly frostNovaAbilityId: number = FourCC("A021");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const skeleton = Unit.fromEvent();
      if (!this.armored.has(skeleton.id)) return;
      this.armored.delete(skeleton.id);

      const { owner, x, y } = skeleton;
      let nearest: Unit | undefined;
      let nearestDistance = 0;
      const grp = Group.fromRange(400, skeleton.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const distance = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (nearest != null && distance >= nearestDistance) return;
        nearest = u;
        nearestDistance = distance;
      });
      grp.destroy();

      Effect.create(
        "Abilities/Spells/Undead/FrostArmor/FrostArmorDamage.mdl",
        x,
        y,
      ).destroy();
      if (nearest == null) return;

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.frostNovaAbilityId);
      dummy.issueTargetOrder("frostnova", nearest);
    });
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const summon = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const skeletons = (this.itemSkeletons.get(itemId) ?? []).filter((s) =>
        s.isAlive(),
      );
      for (let i = 0; i < 3; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const sx = x + 150 * Math.cos(radians);
        const sy = y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Undead/RaiseSkeletonWarrior/RaiseSkeleton.mdl",
          sx,
          sy,
        ).destroy();
        const skeleton = Unit.create(owner, this.skeletonUnitTypeId, sx, sy);
        skeleton.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
        skeleton.setAnimation("birth");
        skeleton.queueAnimation("stand");
        skeletons.push(skeleton);
        this.armored.add(skeleton.id);

        const dummy = Unit.create(owner, this.dummyUnitId, sx, sy);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
        dummy.addAbility(this.frostArmorAbilityId);
        dummy.issueTargetOrder("frostarmor", skeleton);
      }
      this.itemSkeletons.set(itemId, skeletons);
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, summon);
    summon();
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

    const skeletons = this.itemSkeletons.get(itemId);
    this.itemSkeletons.delete(itemId);
    if (skeletons == null) return;
    for (const skeleton of skeletons) {
      this.armored.delete(skeleton.id);
      if (skeleton.isAlive()) skeleton.kill();
    }
  }
}
