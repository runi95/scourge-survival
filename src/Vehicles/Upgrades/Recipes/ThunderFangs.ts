import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { ThunderFangsDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/ThunderFangsDamageEvent";

const MULT = Math.PI / 180;

interface Pack {
  wolves: Unit[];
  timers: Timer[];
}

// Every 30 seconds 2 wolves (o006: 46 - 47, 15% x2 crit, 500 life, 30 s,
// biting flyers too). Every second bite of a wolf has a chain lightning (A000:
// 125, -15% a jump) cast at the enemy it bit
export class ThunderFangs extends WeaponUpgradeRecipe {
  public readonly cooldown = 30;
  public readonly itemTypeId = FourCC("I08S");
  public readonly merchantItemTypeId = FourCC("I08T");
  public readonly recipe: number[] = [FourCC("I00Q"), FourCC("I05I")];

  private readonly packs = new Map<number, Pack>();
  private readonly wolfUnitId: number = FourCC("o006");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly chainLightningAbilityId: number = FourCC("A000");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pack: Pack = { wolves: [], timers: [] };
    this.packs.set(itemId, pack);

    const summon = () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.forget(pack);
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const wx = hero.x + 150 * Math.cos(radians);
        const wy = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/FeralSpirit/feralspirittarget.mdl",
          wx,
          wy,
        ).destroy();
        const wolf = Unit.create(owner, this.wolfUnitId, wx, wy);
        wolf.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
        pack.wolves.push(wolf);

        let bites = 0;
        ThunderFangsDamageEvent.WOLVES.set(wolf.id, (bitten) => {
          if (++bites < 2) return;
          bites = 0;
          if (!bitten.isAlive()) return;
          const dummy = Unit.create(owner, this.dummyUnitId, wolf.x, wolf.y);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
          dummy.addAbility(this.chainLightningAbilityId);
          dummy.issueTargetOrder("chainlightning", bitten);
        });
      }
    };

    const t = TimerUtils.newTimer();
    t.start(this.cooldown, true, summon);
    pack.timers.push(t);
    summon();
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
    for (const wolf of pack.wolves) {
      if (wolf.isAlive()) wolf.kill();
    }
    this.forget(pack);
  }

  // The wolves of the last summon, dead or alive, are forgotten
  private forget(pack: Pack) {
    for (const wolf of pack.wolves) {
      ThunderFangsDamageEvent.WOLVES.delete(wolf.id);
    }
    pack.wolves.length = 0;
  }
}
