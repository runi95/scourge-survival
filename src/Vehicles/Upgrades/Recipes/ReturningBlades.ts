import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Knife {
  host: Unit;
  x: number;
  y: number;
}

// A fan of knives that leaves a knife stuck in every enemy it hits. Every
// third fan, all the stuck knives tear out of their hosts (dead ones too) and
// fly back to the hero, cutting every enemy on their way in
export class ReturningBlades extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0DA");
  public readonly merchantItemTypeId = FourCC("I0DB");
  public readonly recipe: number[] = [FourCC("I05R"), FourCC("I05R")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly fanOfKnivesAbilityId: number = FourCC("A048");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    let knives: Knife[] = [];
    let fans = 0;
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const hero = vehicle.unit;
      const hosts: Unit[] = [];
      const grp = Group.fromRange(400, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        hosts.push(u);
      });
      grp.destroy();
      if (hosts.length === 0) return;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.fanOfKnivesAbilityId);
      dummy.issueImmediateOrder("fanofknives");
      // At most 40 knives stuck at a time
      for (const host of hosts) {
        if (knives.length >= 40) break;
        knives.push({ host, x: host.x, y: host.y });
      }

      fans++;
      if (fans < 3) return;
      fans = 0;
      this.recall(hero, owner, knives);
      knives = [];
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
    TimerUtils.releaseTimer(t);
  }

  // Each knife tears out of its host for 100, then flies at 1200 a second to
  // the hero and cuts every enemy within 75 of it on the way for 100, once
  private recall(hero: Unit, owner: MapPlayer, knives: Knife[]): void {
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    const at = Point.create(hero.x, hero.y);
    const flying: { effect: Effect; x: number; y: number; cut: Set<number> }[] =
      [];
    for (const knife of knives) {
      // A host that died keeps its knife where its corpse lies
      if (knife.host.typeId !== 0) {
        knife.x = knife.host.x;
        knife.y = knife.host.y;
      }
      if (knife.host.isAlive()) this.cut(dummy, knife.host, 100);

      const effect = Effect.create(
        "Abilities/Spells/NightElf/FanOfKnives/FanOfKnivesMissile.mdl",
        knife.x,
        knife.y,
      );
      effect.setHeight(60);
      flying.push({
        effect,
        x: knife.x,
        y: knife.y,
        cut: new Set([knife.host.id]),
      });
    }

    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      for (let i = flying.length - 1; i >= 0; i--) {
        const knife = flying[i];
        const angle = Math.atan2(hero.y - knife.y, hero.x - knife.x);
        const left = Math.sqrt(
          (hero.x - knife.x) ** 2 + (hero.y - knife.y) ** 2,
        );
        const step = Math.min(38, left);
        knife.x += step * Math.cos(angle);
        knife.y += step * Math.sin(angle);
        knife.effect.x = knife.x;
        knife.effect.y = knife.y;
        knife.effect.setYaw(angle);

        at.setPosition(knife.x, knife.y);
        const grp = Group.fromRange(75, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if (knife.cut.has(u.id)) return;

          knife.cut.add(u.id);
          this.cut(dummy, u, 100);
        });
        grp.destroy();

        // Stray knives give up after 3 seconds
        if (step < left && elapsed < 3) continue;
        knife.effect.destroy();
        flying.splice(i, 1);
      }
      if (flying.length > 0) return;

      TimerUtils.releaseTimer(t);
      at.destroy();
    });
  }

  private cut(dummy: Unit, u: Unit, damage: number): void {
    dummy.damageTarget(
      u.handle,
      damage,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    Effect.createAttachment(
      "Objects/Spawnmodels/Critters/Little_Blood/LittleBloodExplosion.mdl",
      u,
      "chest",
    ).destroy();
  }
}
