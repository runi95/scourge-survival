import { Trigger, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { GameMap } from "../../Game/GameMap";
import { Globals } from "../../Utility/Globals";
import { Group } from "../../Utility/Group";

export class CursedDoll {
  private readonly dollAbilityId = FourCC("A04O");
  private readonly dollUnitId = FourCC("o003");
  private readonly dummyUnitId = FourCC("u000");
  private readonly curseAbilityId = FourCC("A04R");
  private readonly tauntRange = 500;
  private readonly curseRange = 500;
  private readonly duration = [6, 7, 8, 9, 10];
  private readonly life = [250, 400, 550, 700, 850];

  constructor() {
    const trig = Trigger.create();
    trig.addAction(() => {
      if (GetSpellAbilityId() !== this.dollAbilityId) return;

      const caster = Unit.fromEvent();
      const level = caster.getAbilityLevel(this.dollAbilityId);
      const doll = Unit.create(
        caster.owner,
        this.dollUnitId,
        GetSpellTargetX(),
        GetSpellTargetY(),
        270,
      );
      doll.maxLife = this.life[level - 1];
      doll.life = this.life[level - 1];
      doll.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, this.duration[level - 1]);

      const creeps = GameMap.REMAINING_PLAYER_CREEPS[caster.owner.id + 9];
      if (creeps == null) return;

      for (const [_id, creep] of creeps) {
        if (!creep.unit.isAlive()) continue;
        if (creep.tauntTarget != null && creep.tauntTarget.isAlive()) continue;

        const dx = creep.unit.x - doll.x;
        const dy = creep.unit.y - doll.y;
        if (dx * dx + dy * dy > this.tauntRange * this.tauntRange) continue;

        creep.tauntTarget = doll;
        creep.unit.issueTargetOrder(OrderId.Attack, doll);
      }
    });
    trig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_SPELL_EFFECT);

    const deathTrig = Trigger.create();
    deathTrig.addAction(() => {
      const doll = Unit.fromEvent();
      if (doll.typeId !== this.dollUnitId) return;

      this.releaseCreeps(doll);
      this.curseEnemies(doll);
    });
    deathTrig.registerAnyUnitEvent(EVENT_PLAYER_UNIT_DEATH);
  }

  private releaseCreeps(doll: Unit): void {
    const playerId = doll.owner.id;
    const creeps = GameMap.REMAINING_PLAYER_CREEPS[playerId + 9];
    if (creeps == null) return;

    const vehicle = GameMap.PLAYER_VEHICLES[playerId];
    for (const [_id, creep] of creeps) {
      if (creep.tauntTarget?.handle !== doll.handle) continue;
      creep.tauntTarget = null;
      if (!creep.unit.isAlive()) continue;

      creep.attackOrderPosition = [vehicle.lastKnownX, vehicle.lastKnownY];
      creep.unit.issueOrderAt(
        OrderId.Attack,
        vehicle.lastKnownX,
        vehicle.lastKnownY,
      );
    }
  }

  private curseEnemies(doll: Unit): void {
    const grp = Group.fromRange(this.curseRange, doll.point);
    grp.for((u) => {
      if (!u.isAlive() || !u.isEnemy(doll.owner)) return;

      const dummy = Unit.create(doll.owner, this.dummyUnitId, doll.x, doll.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      dummy.addAbility(this.curseAbilityId);
      dummy.issueTargetOrder("curse", u);
    });
    grp.destroy();
  }
}
