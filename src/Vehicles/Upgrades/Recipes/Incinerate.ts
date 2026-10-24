import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { GameMap } from "../../../Game/GameMap";
import { IncinerateDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/IncinerateDamageEvent";

// Every 0.5 seconds a rocket (u00Q: 25, +10 for every rocket that hit the
// target before, up to +100; IncinerateDamageEvent) at the enemy it hit last,
// or the nearest enemy within 650 once that one is gone or out of range. An
// incinerated scourge unit that dies, however it dies, explodes: 25 for every
// rocket that hit it to every enemy within 200, each of them incinerated once
export class Incinerate extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.5;
  public readonly itemTypeId = FourCC("I01K");
  public readonly merchantItemTypeId = FourCC("I01L");
  public readonly recipe: number[] = [FourCC("I000"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly targets = new Map<number, Unit>();
  private readonly rocketUnitId: number = FourCC("u00Q");
  private deathTrigger: Trigger;

  public onInitialize(): void {
    this.deathTrigger = Trigger.create();
    this.deathTrigger.addAction(() => {
      const dying = Unit.fromHandle(GetTriggerUnit());
      const fire = IncinerateDamageEvent.FIRES.get(dying.id);
      if (fire == null) return;
      IncinerateDamageEvent.FIRES.delete(dying.id);
      fire.effect.destroy();

      const source = GameMap.PLAYER_VEHICLES[fire.playerId].unit;
      if (source == null) return;
      const owner = source.owner;
      Effect.create(
        "Abilities/Spells/Other/Incinerate/FireLordDeathExplode.mdl",
        dying.x,
        dying.y,
      ).destroy();
      const caught: Unit[] = [];
      const grp = Group.fromRange(200, dying.point);
      grp.for((u) => {
        if (u === dying) return;
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        caught.push(u);
      });
      grp.destroy();
      for (const u of caught) {
        // Lit first, so whatever the blast kills explodes in turn
        IncinerateDamageEvent.ignite(u, fire.playerId, 1);
        source.damageTarget(
          u.handle,
          25 * fire.stacks,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    });
    this.deathTrigger.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let target = this.targets.get(itemId);
      if (
        target == null ||
        !target.isAlive() ||
        !target.isVisible(owner) ||
        (target.x - hero.x) * (target.x - hero.x) +
          (target.y - hero.y) * (target.y - hero.y) >
          650 * 650
      ) {
        target = undefined;
        let nearest = 0;
        const grp = Group.fromRange(650, hero.point);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isVisible(owner)) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

          const dx = u.x - hero.x;
          const dy = u.y - hero.y;
          if (target == null || dx * dx + dy * dy < nearest) {
            target = u;
            nearest = dx * dx + dy * dy;
          }
        });
        grp.destroy();
        if (target == null) {
          this.targets.delete(itemId);
          return;
        }
        this.targets.set(itemId, target);
      }

      const rocket = Unit.create(owner, this.rocketUnitId, hero.x, hero.y);
      rocket.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      rocket.issueTargetOrder("attack", target);
    });
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
    this.targets.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
