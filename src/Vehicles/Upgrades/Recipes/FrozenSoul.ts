import { Effect, Item, MapPlayer, Point, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Soul {
  unit: Unit;
  owner: MapPlayer;
  effect: Effect;
  ready: boolean;
}

// Freezes the soul of the strongest enemy. Every enemy that dies near it
// makes the frozen soul burst in a Frost Nova, so kills ripple through its
// pack; shadow bolts at the pack start the ripple
export class FrozenSoul extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I0AU");
  public readonly merchantItemTypeId = FourCC("I0AV");
  public readonly recipe: number[] = [FourCC("I05J"), FourCC("I041")];

  private readonly soulTimers = new Map<number, Timer>();
  private readonly boltTimers = new Map<number, Timer>();
  private readonly souls = new Map<number, Soul>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly shadowBoltUnitTypeId: number = FourCC("u01Q");
  private readonly frostNovaAbilityId: number = FourCC("A03B");
  private readonly reach = 400;

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      for (const [itemId, soul] of this.souls) {
        if (dying.handle === soul.unit.handle) {
          // The soul shatters with its body
          this.release(itemId);
          this.burst(soul, dying.x, dying.y);
          continue;
        }
        if (!soul.ready || !dying.isEnemy(soul.owner)) continue;
        const dx = dying.x - soul.unit.x;
        const dy = dying.y - soul.unit.y;
        if (dx * dx + dy * dy > this.reach * this.reach) continue;

        soul.ready = false;
        const t = TimerUtils.newTimer();
        t.start(0.25, false, () => {
          TimerUtils.releaseTimer(t);
          soul.ready = true;
        });
        this.burst(soul, soul.unit.x, soul.unit.y);
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
    const freeze = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.release(itemId);

      let strongest: Unit | undefined;
      const grp = Group.fromRange(700, vehicle.unit.point);
      grp.for((u) => {
        if (!this.isEnemy(u, owner)) return;
        if (!u.isVisible(owner)) return;

        if (strongest != null && u.life <= strongest.life) return;
        strongest = u;
      });
      grp.destroy();
      if (strongest == null) return;

      const soul: Soul = {
        unit: strongest,
        owner,
        effect: Effect.createAttachment(
          "Abilities/Spells/Undead/FrostArmor/FrostArmorTarget.mdl",
          strongest,
          "chest",
        ),
        ready: true,
      };
      this.souls.set(itemId, soul);
      this.burst(soul, strongest.x, strongest.y);
    };
    const souls: Timer = TimerUtils.newTimer();
    this.soulTimers.set(itemId, souls);
    souls.start(this.cooldown, true, freeze);
    freeze();

    // Shadow bolts finish off the weakest of the frozen soul's pack, or of
    // anyone in range without one
    const bolts: Timer = TimerUtils.newTimer();
    this.boltTimers.set(itemId, bolts);
    bolts.start(0.75, true, () => {
      const soul = this.souls.get(itemId);
      const center = soul != null ? soul.unit : vehicle.unit;
      let target: Unit | undefined;
      const grp = Group.fromRange(
        soul != null ? this.reach : 600,
        center.point,
      );
      grp.for((u) => {
        if (!this.isEnemy(u, owner)) return;
        if (!u.isVisible(owner)) return;
        if (u.handle === soul?.unit.handle) return;

        if (target != null && u.life >= target.life) return;
        target = u;
      });
      grp.destroy();
      if (target == null) return;

      const { x, y } = vehicle.unit;
      const bolt = Unit.create(owner, this.shadowBoltUnitTypeId, x, y);
      bolt.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      bolt.issueTargetOrder("attack", target);
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    TimerUtils.releaseTimer(this.soulTimers.get(itemId));
    this.soulTimers.delete(itemId);
    TimerUtils.releaseTimer(this.boltTimers.get(itemId));
    this.boltTimers.delete(itemId);
    this.release(itemId);
  }

  private release(itemId: number): void {
    const soul = this.souls.get(itemId);
    if (soul == null) return;
    this.souls.delete(itemId);
    soul.effect.destroy();
  }

  // A Frost Nova on the soul, or around where it fell
  private burst(soul: Soul, x: number, y: number): void {
    let target: Unit | undefined = soul.unit.isAlive() ? soul.unit : undefined;
    if (target == null) {
      const at = Point.create(x, y);
      const grp = Group.fromRange(200, at);
      grp.for((u) => {
        if (target == null && this.isEnemy(u, soul.owner)) target = u;
      });
      grp.destroy();
      at.destroy();
    }
    if (target == null) return;

    const dummy = Unit.create(soul.owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.frostNovaAbilityId);
    dummy.issueTargetOrder("frostnova", target);
  }

  private isEnemy(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    return true;
  }
}
