import { Effect, Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

const MULT = Math.PI / 180;

interface Pack {
  vehicle: Vehicle;
  owner: MapPlayer;
  weaponIndex: number;
  wolf?: Unit;
  kills: number;
  timers: Timer[];
}

// One wolf (o005: 50, 15% x2 crit, 800 life) by the hero until it is
// destroyed. Every kill of its own adds 4 damage, 40 life and 1.5% size, up
// to 30 kills. When it dies it blows up (100 + 10 per kill to every enemy
// ground unit within 300) and a new one comes 10 seconds later with half its
// kills
export class IronWolf extends WeaponUpgradeRecipe {
  public readonly cooldown = 10;
  public readonly itemTypeId = FourCC("I07O");
  public readonly merchantItemTypeId = FourCC("I07P");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I05I")];

  private readonly packs = new Map<number, Pack>();
  private readonly wolfUnitId: number = FourCC("o005");

  public onInitialize(): void {
    const trig = Trigger.create();
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
    trig.addAction(() => {
      const dying = Unit.fromEvent();
      const killer = Unit.fromHandle(GetKillingUnit());
      for (const [_itemId, pack] of this.packs) {
        if (pack.wolf == null) continue;
        if (dying === pack.wolf) this.fall(pack);
        else if (killer === pack.wolf && dying.isEnemy(pack.owner)) {
          this.grow(pack);
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
    const pack: Pack = { vehicle, owner, weaponIndex, kills: 0, timers: [] };
    this.packs.set(itemId, pack);

    // It keeps up with the hero
    const heel = TimerUtils.newTimer();
    heel.start(1, true, () => {
      const wolf = pack.wolf;
      if (wolf == null) return;
      const hero = vehicle.unit;
      const dx = wolf.x - hero.x;
      const dy = wolf.y - hero.y;
      if (dx * dx + dy * dy < 500 * 500) return;
      wolf.issueOrderAt("attack", hero.x, hero.y);
    });
    pack.timers.push(heel);
    this.build(pack);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const pack = this.packs.get(itemId);
    this.packs.delete(itemId);
    if (pack == null) return;
    for (const t of pack.timers) TimerUtils.releaseTimer(t);
    pack.timers.length = 0;
    if (pack.wolf != null) pack.wolf.destroy();
    pack.wolf = undefined;
  }

  private build(pack: Pack) {
    const hero = pack.vehicle.unit;
    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    const x = hero.x + 150 * Math.cos(radians);
    const y = hero.y + 150 * Math.sin(radians);
    Effect.create(
      "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
      x,
      y,
    ).destroy();
    const wolf = Unit.create(pack.owner, this.wolfUnitId, x, y);
    wolf.setBaseDamage(wolf.getBaseDamage(0) + 4 * pack.kills, 0);
    wolf.maxLife = wolf.maxLife + 40 * pack.kills;
    wolf.life = wolf.maxLife;
    const scale = 1 + 0.015 * pack.kills;
    wolf.setScale(scale, scale, scale);
    pack.wolf = wolf;
  }

  private grow(pack: Pack) {
    if (pack.kills >= 30) return;
    pack.kills++;
    const wolf = pack.wolf;
    wolf.setBaseDamage(wolf.getBaseDamage(0) + 4, 0);
    wolf.maxLife = wolf.maxLife + 40;
    wolf.life = wolf.life + 40;
    const scale = 1 + 0.015 * pack.kills;
    wolf.setScale(scale, scale, scale);
    Effect.createAttachment(
      "Abilities/Spells/Items/AIsm/AIsmTarget.mdl",
      wolf,
      "origin",
    ).destroy();
  }

  // It blows up, and a new one comes with half its kills
  private fall(pack: Pack) {
    const wolf = pack.wolf;
    pack.wolf = undefined;
    const hero = pack.vehicle.unit;
    const { x, y } = wolf;
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      x,
      y,
    ).destroy();
    const damage = 100 + 10 * pack.kills;
    const grp = Group.fromRange(300, wolf.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(pack.owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      hero.damageTarget(
        u.handle,
        damage,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
    grp.destroy();

    pack.kills = Math.floor(pack.kills / 2);
    hero.startAbilityCooldown(
      weaponDummyAbilityIds[pack.weaponIndex],
      this.cooldown,
    );
    const t = TimerUtils.newTimer();
    pack.timers.push(t);
    t.start(this.cooldown, false, () => {
      const i = pack.timers.indexOf(t);
      if (i >= 0) pack.timers.splice(i, 1);
      TimerUtils.releaseTimer(t);
      this.build(pack);
    });
  }
}
