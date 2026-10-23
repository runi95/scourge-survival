import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Field {
  x: number;
  y: number;
  left: number;
  knives: Effect[];
}

interface Walker {
  x: number;
  y: number;
  slowed: number;
}

// Fans of knives whose knives stay strewn on the ground within 400 of where
// they were flung, for 9 seconds. Nothing goes off: an enemy ground unit is
// cut only while it walks through them, by how far it walks, and slowed
export class Caltrops extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0D6");
  public readonly merchantItemTypeId = FourCC("I0D7");
  public readonly recipe: number[] = [FourCC("I05R"), FourCC("I003")];

  private readonly timers = new Map<number, Timer>();
  private readonly fields = new Map<number, Field[]>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly fanOfKnivesAbilityId: number = FourCC("A048");
  private readonly slowAbilityId: number = FourCC("A055");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const fields: Field[] = [];
    this.fields.set(itemId, fields);
    const walkers = new Map<number, Walker>();
    let elapsed = 0;
    let clock = 0;

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.25, true, () => {
      elapsed += 0.25;
      clock += 0.25;
      for (let i = fields.length - 1; i >= 0; i--) {
        fields[i].left -= 0.25;
        if (fields[i].left > 0) continue;
        for (const knife of fields[i].knives) knife.destroy();
        fields.splice(i, 1);
      }

      if (elapsed >= this.cooldown && this.fan(vehicle.unit, owner, fields)) {
        elapsed = 0;
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }

      this.cut(vehicle.unit, owner, fields, walkers, clock);
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

    for (const field of this.fields.get(itemId) ?? []) {
      for (const knife of field.knives) knife.destroy();
    }
    this.fields.delete(itemId);
  }

  // Flings the fan when an enemy is within 400 and strews its knives
  private fan(hero: Unit, owner: MapPlayer, fields: Field[]): boolean {
    let found = false;
    const grp = Group.fromRange(400, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      found = true;
    });
    grp.destroy();
    if (!found) return false;

    const { x, y } = hero;
    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.fanOfKnivesAbilityId);
    dummy.issueImmediateOrder("fanofknives");

    const knives: Effect[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = GetRandomReal(0, 2 * Math.PI);
      const distance = 400 * Math.sqrt(GetRandomReal(0.05, 1));
      const knife = Effect.create(
        "Abilities/Spells/NightElf/FanOfKnives/FanOfKnivesMissile.mdl",
        x + distance * Math.cos(angle),
        y + distance * Math.sin(angle),
      );
      knife.setYaw(GetRandomReal(0, 2 * Math.PI));
      knife.scale = 0.8;
      knives.push(knife);
    }
    fields.push({ x, y, left: 9, knives });
    return true;
  }

  // Every enemy ground unit inside a field is cut 150 for every 100 it walked
  // since the last check and slowed, at most once a second
  private cut(
    hero: Unit,
    owner: MapPlayer,
    fields: Field[],
    walkers: Map<number, Walker>,
    now: number,
  ): void {
    // Units are watched from 100 outside the fields, so a step into one counts
    const near = new Map<number, Unit>();
    const at = Point.create(0, 0);
    for (const field of fields) {
      at.setPosition(field.x, field.y);
      const grp = Group.fromRange(500, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        near.set(u.id, u);
      });
      grp.destroy();
    }
    at.destroy();

    const seen = new Set<number>();
    for (const [_id, u] of near) {
      seen.add(u.id);
      const walker = walkers.get(u.id);
      if (walker == null) {
        walkers.set(u.id, { x: u.x, y: u.y, slowed: -1 });
        continue;
      }
      const walked = Math.min(
        100,
        Math.sqrt((u.x - walker.x) ** 2 + (u.y - walker.y) ** 2),
      );
      walker.x = u.x;
      walker.y = u.y;
      if (walked < 5) continue;
      if (
        !fields.some((f) => (u.x - f.x) ** 2 + (u.y - f.y) ** 2 <= 400 * 400)
      ) {
        continue;
      }

      hero.damageTarget(
        u.handle,
        walked * 1.5,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (now - walker.slowed < 1) continue;
      walker.slowed = now;
      Effect.createAttachment(
        "Objects/Spawnmodels/Critters/Little_Blood/LittleBloodExplosion.mdl",
        u,
        "origin",
      ).destroy();
      const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.slowAbilityId);
      dummy.issueTargetOrder("slow", u);
    }
    const gone: number[] = [];
    for (const [id] of walkers) if (!seen.has(id)) gone.push(id);
    for (const id of gone) walkers.delete(id);
  }
}
