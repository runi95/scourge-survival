import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Swarm {
  bats: number;
  flock?: Effect;
  // How far the hero went (or stood, 150 a second) towards the next bat
  gathering: number;
  // Seconds the hero has stood still, and whether it moved since the plunge
  still: number;
  stirred: boolean;
  resting: number;
  x: number;
  y: number;
}

// Bats gather over the hero, one for every 100 it moves (or every 0.7
// seconds it stands), up to 10. When the hero stops after moving with 3 or
// more, or the swarm is full, they plunge into the ground and burst back up
// as a ring of spikes around the hero, hurting more for every bat
export class PlungingSwarm extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0A6");
  public readonly merchantItemTypeId = FourCC("I0A7");
  public readonly recipe: number[] = [FourCC("I001"), FourCC("I05L")];

  private readonly timers = new Map<number, Timer>();
  private readonly swarms = new Map<number, Swarm>();
  private readonly dummyUnitId: number = FourCC("u000");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hero = vehicle.unit;
    const swarm: Swarm = {
      bats: 0,
      gathering: 0,
      still: 0,
      stirred: false,
      resting: 0,
      x: hero.x,
      y: hero.y,
    };
    this.swarms.set(itemId, swarm);

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(0.1, true, () => {
      const { x, y } = hero;
      const moved = Math.sqrt(
        (x - swarm.x) * (x - swarm.x) + (y - swarm.y) * (y - swarm.y),
      );
      swarm.x = x;
      swarm.y = y;
      swarm.resting = Math.max(0, swarm.resting - 0.1);
      if (moved > 5) {
        swarm.gathering += moved;
        swarm.still = 0;
        swarm.stirred = true;
      } else {
        swarm.gathering += 15;
        swarm.still += 0.1;
      }
      while (swarm.gathering >= 100 && swarm.bats < 10) {
        swarm.gathering -= 100;
        swarm.bats++;
      }
      if (swarm.bats >= 10) swarm.gathering = 0;

      if (swarm.bats > 0) {
        swarm.flock ??= Effect.create(
          "Doodads/Northrend/Props/Bats/Bats.mdl",
          x,
          y,
        );
        swarm.flock.x = x;
        swarm.flock.y = y;
        swarm.flock.setHeight(200);
        swarm.flock.scale = 0.6 + 0.08 * swarm.bats;
      }

      if (swarm.resting > 0) return;
      const stopped = swarm.stirred && swarm.still >= 0.5 && swarm.bats >= 3;
      if (!stopped && swarm.bats < 10) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.plunge(owner, x, y, swarm.bats);
      swarm.flock?.destroy();
      swarm.flock = undefined;
      swarm.bats = 0;
      swarm.gathering = 0;
      swarm.stirred = false;
      swarm.resting = this.cooldown;
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

    this.swarms.get(itemId)?.flock?.destroy();
    this.swarms.delete(itemId);
  }

  // A ring of spikes 125 to 375 from (x, y), 0.3 seconds after the bats dive
  private plunge(owner: MapPlayer, x: number, y: number, bats: number): void {
    Effect.create(
      "Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmDamage.mdl",
      x,
      y,
    ).destroy();
    const t = TimerUtils.newTimer();
    t.start(0.3, false, () => {
      TimerUtils.releaseTimer(t);
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        Effect.create(
          "Abilities/Spells/Undead/Impale/ImpaleMissTarget.mdl",
          x + 250 * Math.cos(angle),
          y + 250 * Math.sin(angle),
        ).destroy();
      }

      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      const grp = Group.fromRange(375, dummy.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;
        const dx = u.x - x;
        const dy = u.y - y;
        if (dx * dx + dy * dy < 125 * 125) return;

        Effect.createAttachment(
          "Abilities/Spells/Undead/Impale/ImpaleHitTarget.mdl",
          u,
          "origin",
        ).destroy();
        StunUtils.stunUnit(u.handle, 1);
        dummy.damageTarget(
          u.handle,
          40 * bats,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
      grp.destroy();
    });
  }
}
