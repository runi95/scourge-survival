import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Gang {
  captives: Unit[];
  timers: Timer[];
}

// A javelin (u00X: 34 - 39 at the nearest enemy within 450) every 1.25
// seconds. Every 4 seconds a net (A042: held 3 s, and 60 damage) at the
// enemy within 600 with the lowest share of its life; one it leaves below
// 35% is killed and replaced by a copy of it for the player with half its
// life for 20 seconds, up to 3 at a time (the oldest goes first)
export class PressGang extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I088");
  public readonly merchantItemTypeId = FourCC("I089");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I05G")];

  private readonly gangs = new Map<number, Gang>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly javelinUnitId: number = FourCC("u00X");
  private readonly netAbilityId: number = FourCC("A042");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const gang: Gang = { captives: [], timers: [] };
    this.gangs.set(itemId, gang);

    const javelins = TimerUtils.newTimer();
    javelins.start(1.25, true, () => {
      const { x, y } = vehicle.unit;
      const javelin = Unit.create(owner, this.javelinUnitId, x, y);
      javelin.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    });

    const nets = TimerUtils.newTimer();
    nets.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let target: Unit | undefined;
      let lowest = 0;
      const grp = Group.fromRange(600, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        const share = u.life / u.maxLife;
        if (target == null || share < lowest) {
          target = u;
          lowest = share;
        }
      });
      grp.destroy();
      if (target == null) return;

      const netted = target;
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
      dummy.addAbility(this.netAbilityId);
      dummy.issueTargetOrder("ensnare", netted);
      hero.damageTarget(
        netted.handle,
        60,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!netted.isAlive()) return;
      if (netted.isUnitType(UNIT_TYPE_HERO)) return;
      if (netted.life > 0.35 * netted.maxLife) return;
      this.capture(hero, owner, gang, netted);
    });
    gang.timers.push(javelins, nets);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const gang = this.gangs.get(itemId);
    this.gangs.delete(itemId);
    if (gang == null) return;
    for (const t of gang.timers) TimerUtils.releaseTimer(t);
    gang.timers.length = 0;
    for (const captive of gang.captives) {
      if (captive.isAlive()) captive.kill();
    }
    gang.captives.length = 0;
  }

  // The enemy dies to the hero and a copy of it joins the hero
  private capture(hero: Unit, owner: MapPlayer, gang: Gang, enemy: Unit) {
    const typeId = enemy.typeId;
    const { x, y, facing } = enemy;
    hero.damageTarget(
      enemy.handle,
      enemy.life + 100,
      false,
      false,
      ATTACK_TYPE_CHAOS,
      DAMAGE_TYPE_UNIVERSAL,
      WEAPON_TYPE_WHOKNOWS,
    );

    for (let i = gang.captives.length - 1; i >= 0; i--) {
      if (!gang.captives[i].isAlive()) gang.captives.splice(i, 1);
    }
    if (gang.captives.length >= 3) {
      const oldest = gang.captives.shift();
      if (oldest.isAlive()) oldest.kill();
    }

    Effect.create(
      "Abilities/Spells/Orc/Ensnare/EnsnareMissile.mdl",
      x,
      y,
    ).destroy();
    const captive = Unit.create(owner, typeId, x, y, facing);
    captive.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 20);
    captive.life = 0.5 * captive.maxLife;
    captive.setVertexColor(150, 255, 150, 255);
    gang.captives.push(captive);
  }
}
