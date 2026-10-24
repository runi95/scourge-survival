import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Form {
  // Seconds since the last Avatar began, and since the last slam
  since: number;
  slam: number;
  // The hero's own scale while it is an Avatar
  scale: number | undefined;
  effect: Effect | undefined;
  timer: Timer;
}

// Every 3 seconds a thunder clap (A03Z: 60 within 250, slowed 3 s) around the
// hero when an enemy ground unit is within 300. Every 16 seconds the hero is
// an Avatar for 8 s, twice its size: then every second a clap (A05N: 100
// within 500, slowed 3 s) when an enemy ground unit is within 550
export class Avatar extends WeaponUpgradeRecipe {
  public readonly cooldown = 16;
  public readonly itemTypeId = FourCC("I076");
  public readonly merchantItemTypeId = FourCC("I077");
  public readonly recipe: number[] = [FourCC("I05C"), FourCC("I05C")];

  private readonly forms = new Map<number, Form>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly clapAbilityId: number = FourCC("A03Z");
  private readonly avatarClapAbilityId: number = FourCC("A05N");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const form: Form = {
      since: 0,
      slam: 0,
      scale: undefined,
      effect: undefined,
      timer: TimerUtils.newTimer(),
    };
    this.forms.set(itemId, form);
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );

    form.timer.start(0.5, true, () => {
      const hero = vehicle.unit;
      form.since += 0.5;
      form.slam += 0.5;
      if (form.since >= this.cooldown) {
        form.since = 0;
        hero.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
        this.grow(form, hero);
      } else if (form.since >= 8 && form.scale != null) {
        this.shrink(form, hero);
      }

      const avatar = form.scale != null;
      if (form.slam < (avatar ? 1 : 3)) return;
      if (!this.enemiesWithin(owner, hero, avatar ? 550 : 300)) return;
      form.slam = 0;

      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(avatar ? this.avatarClapAbilityId : this.clapAbilityId);
      dummy.issueImmediateOrder("thunderclap");
    });
  }

  public onDrop(
    vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const form = this.forms.get(itemId);
    this.forms.delete(itemId);
    if (form == null) return;
    TimerUtils.releaseTimer(form.timer);
    if (form.scale != null) this.shrink(form, vehicle.unit);
  }

  private grow(form: Form, hero: Unit) {
    if (form.scale != null) return;
    form.scale = BlzGetUnitRealField(hero.handle, UNIT_RF_SCALING_VALUE);
    hero.setScale(2 * form.scale, 2 * form.scale, 2 * form.scale);
    Effect.create(
      "Abilities/Spells/Human/Avatar/AvatarCaster.mdl",
      hero.x,
      hero.y,
    ).destroy();
    form.effect = Effect.createAttachment(
      "Abilities/Spells/Human/Avatar/AvatarCaster.mdl",
      hero,
      "origin",
    );
  }

  private shrink(form: Form, hero: Unit) {
    hero.setScale(form.scale, form.scale, form.scale);
    form.scale = undefined;
    if (form.effect != null) form.effect.destroy();
    form.effect = undefined;
  }

  private enemiesWithin(owner: MapPlayer, hero: Unit, range: number): boolean {
    let found = false;
    const grp = Group.fromRange(range, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;

      found = true;
    });
    grp.destroy();
    return found;
  }
}
