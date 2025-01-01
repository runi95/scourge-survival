/* eslint-disable */
import { TimerUtils } from "../TimerUtils";
import type { Timer } from "w3ts";
import type { DamageEvent } from "./DamageEvent";
import { Log } from "../../lib/Serilog/Serilog";

type TransformerFunc = (d: DamageInstance) => DamageInstance;

export enum DamageEventType {
  PreDamageEvent,
  ArmorDamageEvent,
  ZeroDamageEvent,
  OnDamageEvent,
  AfterDamageEvent,
  LethalDamageEvent,
  AoeDamageEvent,
}

interface DamageEventRegistry {
  minAOE: null | number;
  filters: boolean[];
  targetClass: null | unittype;
  sourceClass: null | unittype;
  targetItem: null | itemtype; // ItemTypeId
  sourceItem: null | itemtype; // ItemTypeId
  sourceType: null | unittype; // UnitTypeId
  targetType: null | unittype; // UnitTypeId
  targetBuff: null | number; // AbilityTypeId
  sourceBuff: null | number; // AbilityTypeId
  source: null | unit;
  target: null | unit;
  attackType: null | attacktype;
  damageType: null | damagetype;
  weaponType: null | weapontype;
  damageMin: number;
  userType: number;
  eFilter: number;
  trigFrozen: null | boolean;
  levelsDeep: number;

  configured: boolean;
  failChance: number;
  inceptionTrig: boolean;
  damageEvent: DamageEvent;
}

export interface DamageInstance {
  source: unit;
  target: unit;
  damage: number;
  prevAmt: number;
  isAttack: boolean;
  isRanged: boolean;
  isMelee: boolean;
  attackType: null | attacktype;
  damageType: null | damagetype;
  weaponType: null | weapontype;
  isCode: boolean;
  isSpell: boolean;
  recursiveFunc: DamageEventRegistry;
  userType: null | number;
  armorPierced: null | number;
  prevArmorT: null | number;
  armorType: null | number;
  prevDefenseT: null | number;
  defenseType: null | number;

  userAmt: number;

  eFilter: null | number;

  /** Is only set on lethal damage events */
  life: null | number;
}

interface RegisteredDamageEvent {
  filters: {
    [key: number]: boolean;
  };
  levelsDeep: number;
  damageEvent: DamageEvent;
}

type MappedEventsObject = {
  [Property in DamageEventType]: RegisteredDamageEvent[];
};

/**
 * Lua Damage Engine 2.0 (or Damage Engine 5.A.0.0)
 */
export class DamageEngine {
  public static nextType: number | null = null;
  public static readonly targets = CreateGroup();

  /**
   * Configurable variables are listed below
   */
  private static readonly _USE_EXTRA: boolean = false; // If you don't use DamageEventLevel/DamageEventAOE/SourceDamageEvent, set this to false
  private static readonly _USE_ARMOR_MOD: boolean = true; // If you do not modify nor detect armor/defense, set this to false
  private static readonly _USE_MELEE_RANGE: boolean = true; // If you do not detect melee nor ranged damage, set this to false

  private static readonly _LIMBO: number = 16; // When manually-enabled recursion is enabled via Damage.recurion, the engine will never go deeper than LIMBO.
  private static readonly _DEATH_VAL: number = 0.405; // In case M$ or Bliz ever change this, it'll be a quick fix here.

  private static readonly _TYPE_CODE: number = 1; // Must be the same as udg_DamageTypeCode, or 0 if you prefer to disable the automatic flag.
  private static readonly _TYPE_PURE: number = 2; // Must be the same as udg_DamageTypePure

  // These variables coincide with Blizzard's "limitop" type definitions.
  private static readonly _FILTER_ATTACK: number = 0; // LESS_THAN
  private static readonly _FILTER_MELEE: number = 1; // LESS_THAN_OR_EQUAL
  private static readonly _FILTER_OTHER: number = 2; // EQUAL
  private static readonly _FILTER_RANGED: number = 3; // GREATER_THAN_OR_EQUAL
  private static readonly _FILTER_SPELL: number = 4; // GREATER_THAN
  private static readonly _FILTER_CODE: number = 5; // NOT_EQUAL

  private readonly t1: trigger = CreateTrigger();
  private readonly t2: trigger = CreateTrigger();
  private readonly t3: trigger = CreateTrigger();
  private current: DamageInstance = null;
  private userIndex: DamageEventRegistry = null; // userIndex identifies the registry table for the damage function that's currently running.
  private readonly checkConfig = (() => {
    const checkItem = (u: unit, id: number): boolean => {
      if (IsUnitType(u, UNIT_TYPE_HERO)) {
        for (let i = 0; i < UnitInventorySize(u); i++) {
          if (GetItemTypeId(UnitItemInSlot(u, i)) === id) return true;
        }
      }

      return false;
    };

    return () => {
      /**
       * Mapmakers should comment-out any of the below lines that they will never need to check
       * for, and move the most common checks to the top of the list.
       */
      if (!this.userIndex.configured) return true;
      else if (
        this.userIndex.sourceType &&
        GetUnitTypeId(this.current.source) !==
          (this.userIndex.sourceType as unknown as number)
      )
        return true;
      else if (
        this.userIndex.targetType &&
        GetUnitTypeId(this.current.target) !==
          (this.userIndex.targetType as unknown as number)
      )
        return true;
      else if (
        this.userIndex.sourceBuff &&
        GetUnitAbilityLevel(this.current.source, this.userIndex.sourceBuff) ===
          0
      )
        return true;
      else if (
        this.userIndex.targetBuff &&
        GetUnitAbilityLevel(this.current.target, this.userIndex.targetBuff) ===
          0
      )
        return true;
      else if (
        this.userIndex.failChance &&
        GetRandomReal(0.0, 1.0) <= this.userIndex.failChance
      )
        return true;
      else if (
        this.userIndex.userType &&
        this.current.userType !== this.userIndex.userType
      )
        return true;
      else if (
        this.userIndex.source &&
        this.userIndex.source !== this.current.source
      )
        return true;
      else if (
        this.userIndex.target &&
        this.userIndex.target !== this.current.target
      )
        return true;
      else if (
        this.userIndex.attackType &&
        this.userIndex.attackType !== this.current.attackType
      )
        return true;
      else if (
        this.userIndex.damageType &&
        this.userIndex.damageType !== this.current.damageType
      )
        return true;
      else if (
        this.userIndex.sourceItem &&
        !checkItem(
          this.current.source,
          this.userIndex.sourceItem as unknown as number
        )
      )
        return true;
      else if (
        this.userIndex.targetItem &&
        !checkItem(
          this.current.target,
          this.userIndex.targetItem as unknown as number
        )
      )
        return true;
      else if (
        this.userIndex.sourceClass &&
        !IsUnitType(this.current.source, this.userIndex.sourceClass)
      )
        return true;
      else if (
        this.userIndex.targetClass &&
        !IsUnitType(this.current.target, this.userIndex.targetClass)
      )
        return true;
      else if (this.current.damage >= this.userIndex.damageMin) return true;

      Log.Fatal("DamageEngine configuration failed!");
      return false;
    };

    /*
     * Configuration section is over. The rest of the library is hard-coded.
     */
  })();

  private sourceStacks = 1; // sourceStacks holds how many times a single unit was hit from the same source using the same attack. AKA udg_DamageEventLevel.
  private sourceAOE = 1; // sourceAOE holds how many units were hit by the same source using the same attack. AKA udg_DamageEventAOE.
  private originalSource: unit; // originalSource tracks whatever source unit started the current series of damage event(s). AKA udg_AOEDamageSource.
  private originalTarget: unit; // originalTarget tracks whatever target unit was first hit by the original source. AKA udg_EnhancedDamageTarget.

  private static HAS_LETHAL: boolean = false;
  private static HAS_SOURCE: boolean = false;

  private isDreaming: boolean = false;

  /**
   * Enables or disables the damage engine
   *
   * @param {boolean} on - Turn the DamageEngine on (true) or off (false)
   */
  public enable(on: boolean): void {
    if (on) {
      if (this.isDreaming) {
        EnableTrigger(this.t3);
      } else {
        EnableTrigger(this.t1);
        EnableTrigger(this.t2);
      }
    } else {
      if (this.isDreaming) {
        DisableTrigger(this.t3);
      } else {
        DisableTrigger(this.t1);
        DisableTrigger(this.t2);
      }
    }
  }

  private damageOrAfter(): boolean {
    return this.current.damageType === DAMAGE_TYPE_UNKNOWN;
  }
  private breakCheck = {
    [DamageEventType.PreDamageEvent]: () =>
      this.canOverride || this.current.userType === DamageEngine._TYPE_PURE,
    [DamageEventType.ArmorDamageEvent]: () => this.current.damage <= 0.0,
    [DamageEventType.LethalDamageEvent]: () =>
      DamageEngine.HAS_LETHAL && this.current.life > DamageEngine._DEATH_VAL,
    [DamageEventType.OnDamageEvent]: () => this.damageOrAfter(),
    [DamageEventType.AfterDamageEvent]: () => this.damageOrAfter(),
  };
  private canOverride = false;
  private static EVENTS: MappedEventsObject = {
    [DamageEventType.PreDamageEvent]: [],
    [DamageEventType.ArmorDamageEvent]: [],
    [DamageEventType.LethalDamageEvent]: [],
    [DamageEventType.OnDamageEvent]: [],
    [DamageEventType.AfterDamageEvent]: [],
    [DamageEventType.ZeroDamageEvent]: [],
    [DamageEventType.AoeDamageEvent]: [],
  };
  private getEventsFromEventType(damageEventType: DamageEventType) {
    return DamageEngine.EVENTS[damageEventType];
  }

  private defaultCheck = () => false;

  /**
   * Common function to run any major event in the system.
   *
   * @param {DamageEventType} damageEventType
   * @returns {boolean} Did run?
   */
  private runEvent(damageEventType: DamageEventType): boolean {
    const check = this.breakCheck[damageEventType] || this.defaultCheck;
    if (this.isDreaming || check()) return false;

    const events = this.getEventsFromEventType(damageEventType);
    let isFirstEvent = true;
    if (events.length > 0) {
      this.enable(false);
      EnableTrigger(this.t3);
      this.isDreaming = true;

      Log.Debug("Start of event running");
      for (const event of events) {
        this.userIndex = event as any; // FIXME: Don't use any type here!
        if (check()) break;
        if (
          (!this.userIndex.trigFrozen &&
            this.userIndex.eFilter !== null &&
            this.userIndex.filters[this.userIndex.eFilter] &&
            this.checkConfig() &&
            !DamageEngine.HAS_SOURCE) ||
          damageEventType !== DamageEventType.AoeDamageEvent ||
          !isFirstEvent ||
          (this.userIndex.minAOE && this.sourceAOE > this.userIndex.minAOE)
        ) {
          this.userIndex.damageEvent.event(this.current);
        }
        isFirstEvent = false;
      }
      Log.Debug("End of event running");

      this.isDreaming = false;
      this.enable(true);
      DisableTrigger(this.t3);
    }
    return true;
  }

  /**
   * Creates a new object for the damage properties for each particular event sequence.
   *
   * @param {unit} src
   * @param {unit} tgt
   * @param {number} amt
   * @param {boolean} a
   * @param {boolean} r
   * @param {attacktype} at
   * @param {damagetyp} dt
   * @param {weapontype} wt
   * @param {boolean} fromCode
   * @returns {DamageInstance}
   */
  private create(
    src: unit,
    tgt: unit,
    amt: number,
    a: boolean,
    r: boolean,
    at: attacktype,
    dt: damagetype,
    wt: weapontype,
    fromCode: boolean
  ): DamageInstance {
    const isAttack = a;
    const d: DamageInstance = {
      source: src,
      target: tgt,
      damage: amt,
      life: null,
      isAttack,
      isRanged: r,
      attackType: at,
      damageType: dt,
      weaponType: wt,
      prevAmt: amt,
      userAmt: amt,

      isSpell: at === ATTACK_TYPE_NORMAL && !isAttack,

      isCode: false,
      isMelee: false,
      userType: null, // TODO: What should this be?

      eFilter: null, // TODO: What should this be?

      recursiveFunc: null,
      armorPierced: null,
      prevArmorT: null,
      armorType: null,
      defenseType: null,
      prevDefenseT: null,
    };
    if (
      fromCode ||
      DamageEngine.nextType ||
      d.damageType === DAMAGE_TYPE_MIND ||
      (d.damageType === DAMAGE_TYPE_UNKNOWN && d.damage !== 0.0)
    ) {
      d.isCode = true;
      d.userType = DamageEngine.nextType || DamageEngine._TYPE_CODE;
      DamageEngine.nextType = null;
      if (DamageEngine._USE_MELEE_RANGE && !d.isSpell) {
        d.isMelee = a && !r;
        d.isRanged = a && r;
      }
      d.eFilter = DamageEngine._FILTER_CODE;
    } else {
      d.userType = 0;
    }
    return d;
  }

  /**
   * Create a damage event from a naturally-occuring event.
   *
   * @param {boolean} isCode
   * @returns {DamageInstance}
   */
  private createFromEvent(
    eventDamage: number,
    isCode: boolean
  ): DamageInstance {
    const d = this.create(
      GetEventDamageSource(),
      GetTriggerUnit(),
      eventDamage,
      BlzGetEventIsAttack(),
      false,
      BlzGetEventAttackType(),
      BlzGetEventDamageType(),
      BlzGetEventWeaponType(),
      isCode
    );
    if (!d.isCode) {
      if (d.damageType === DAMAGE_TYPE_NORMAL && d.isAttack) {
        if (DamageEngine._USE_MELEE_RANGE) {
          d.isMelee = IsUnitType(d.source, UNIT_TYPE_MELEE_ATTACKER);
          d.isRanged = IsUnitType(d.source, UNIT_TYPE_RANGED_ATTACKER);
          if (d.isMelee && d.isRanged) {
            d.isMelee = !!d.weaponType; // Melee units play a sound when damaging. In naturally-occuring cases where a
            d.isRanged = !d.isMelee; // unit is both ranged and melee, the ranged attack plays no sound.
          }
          if (d.isMelee) {
            d.eFilter = DamageEngine._FILTER_MELEE;
          } else if (d.isRanged) {
            d.eFilter = DamageEngine._FILTER_RANGED;
          } else {
            d.eFilter = DamageEngine._FILTER_ATTACK;
          }
        } else {
          d.eFilter = DamageEngine._FILTER_ATTACK;
        }
      } else {
        if (d.isSpell) {
          d.eFilter = DamageEngine._FILTER_SPELL;
        } else {
          d.eFilter = DamageEngine._FILTER_OTHER;
        }
      }
    }
    return DamageEngine.DAMAGE_INSTANCE_TRANSFORMER(d);
  }

  private isAlarmSet = false;
  private onAOEEnd(): void {
    if (DamageEngine._USE_EXTRA) {
      this.runEvent(DamageEventType.AoeDamageEvent);
      this.sourceAOE = 1;
      this.sourceStacks = 1;
      this.originalTarget = null;
      this.originalSource = null;
      GroupClear(DamageEngine.targets);
    }
  }

  /**
   * Handle any desired armor modification.
   *
   * @param {boolean} reset - reset?
   */
  private setArmor(reset: boolean): void {
    if (DamageEngine._USE_ARMOR_MOD) {
      let pierce: number;
      let at: number;
      let dt: number;
      if (reset) {
        pierce = this.current.armorPierced;
        at = this.current.prevArmorT;
        dt = this.current.prevDefenseT;
      } else {
        pierce = -this.current.armorPierced;
        at = this.current.armorType;
        dt = this.current.defenseType;
      }
      if (pierce !== 0.0) {
        // Changed condition thanks to bug reported by BLOKKADE
        BlzSetUnitArmor(
          this.current.target,
          BlzGetUnitArmor(this.current.target) + pierce
        );
      }
      if (this.current.prevArmorT !== this.current.armorType) {
        BlzSetUnitIntegerField(this.current.target, UNIT_IF_ARMOR_TYPE, at);
      }
      if (this.current.prevDefenseT !== this.current.defenseType) {
        BlzSetUnitIntegerField(this.current.target, UNIT_IF_DEFENSE_TYPE, dt);
      }
    }
  }

  private proclusGlobal: boolean[] = [];
  private fischerMorrow: boolean[] = [];

  /**
   * Setup pre-events before running any user-facing damage events.
   *
   * @param {DamageInstance} d
   * @param {boolean} isNatural
   * @returns {boolean} Is damage zero?
   */
  private doPreEvents(d: DamageInstance, isNatural: boolean): boolean {
    if (DamageEngine._USE_ARMOR_MOD) {
      d.armorType = BlzGetUnitIntegerField(d.target, UNIT_IF_ARMOR_TYPE);
      d.defenseType = BlzGetUnitIntegerField(d.target, UNIT_IF_DEFENSE_TYPE);
      d.prevArmorT = d.armorType;
      d.prevDefenseT = d.defenseType;
      d.armorPierced = 0.0;
    }
    this.current = d;

    this.proclusGlobal[d.source as any] = true;
    this.fischerMorrow[d.target as any] = true;

    if (d.damage === 0.0) {
      return true;
    }
    this.canOverride = d.damageType === DAMAGE_TYPE_UNKNOWN;
    this.runEvent(DamageEventType.PreDamageEvent);
    if (isNatural) {
      BlzSetEventAttackType(d.attackType);
      BlzSetEventDamageType(d.damageType);
      BlzSetEventWeaponType(d.weaponType);
      BlzSetEventDamage(d.damage);
    }
    this.setArmor(false);

    return false;
  }

  private afterDamage(): void {
    if (this.current) {
      this.runEvent(DamageEventType.AfterDamageEvent);
      this.current = null;
    }
    this.canOverride = false;
  }

  private canKick = true;
  private sleepLevel = 0;
  private totem: boolean = false;
  private isKicking: boolean = false;
  private isEventsRun: boolean = false;
  private prepped: DamageInstance = null;
  private recursiveStack: DamageInstance[] = [];

  private finish(): void {
    if (this.isEventsRun) {
      this.isEventsRun = false;
      this.afterDamage();
    }
    this.current = null;
    this.canOverride = false;
    if (this.canKick && !this.isKicking) {
      if (this.recursiveStack.length > 0) {
        this.isKicking = true;
        let i = 0;
        let exit;
        do {
          this.sleepLevel += 1;
          exit = this.recursiveStack.length - 1;
          do {
            this.prepped = this.recursiveStack[i];
            if (UnitAlive(this.prepped.target)) {
              this.doPreEvents(this.prepped, false); // don't evaluate the pre-event
              if (this.prepped.damage > 0.0) {
                DisableTrigger(this.t1); // Force only the after armor event to run.
                EnableTrigger(this.t2); // in case the user forgot to re-enable this
                this.totem = true;
                UnitDamageTarget(
                  this.prepped.source,
                  this.prepped.target,
                  this.prepped.damage,
                  this.prepped.isAttack,
                  this.prepped.isRanged,
                  this.prepped.attackType,
                  this.prepped.damageType,
                  this.prepped.weaponType
                );
              } else {
                this.runEvent(DamageEventType.OnDamageEvent);
                if (this.prepped.damage < 0.0) {
                  // No need for BlzSetEventDamage here
                  SetWidgetLife(
                    this.prepped.target,
                    GetWidgetLife(this.prepped.target) - this.prepped.damage
                  );
                }
                this.setArmor(true);
              }
              this.afterDamage();
            }
            i += 1;
          } while (i >= exit);
        } while (i >= this.recursiveStack.length);
      }
      for (let i = 0; i < this.recursiveStack.length; i++) {
        this.recursiveStack[i].recursiveFunc.trigFrozen = null;
        this.recursiveStack[i].recursiveFunc.levelsDeep = 0;
      }
      this.recursiveStack = [];

      this.sleepLevel = 0;
      this.prepped = null;
      this.isKicking = false;
      this.isDreaming = false;
      this.enable(true);

      this.proclusGlobal = [];
      this.fischerMorrow = [];
      Log.Debug("Cleared up the groups");
    }
  }

  private failsafeClear(): void {
    this.setArmor(true);
    this.canKick = true;
    this.isKicking = false;
    this.totem = false;
    this.runEvent(DamageEventType.OnDamageEvent);
    this.isEventsRun = true;
    this.finish();
  }

  private lastInstance: DamageInstance;
  private attacksImmune = {
    0: false,
    1: true,
    2: true,
    3: true,
    4: false,
    5: true,
    6: true,
  };
  private damagesImmune = {
    0: true,
    1: undefined,
    2: undefined,
    3: undefined,
    4: true,
    5: true,
    6: undefined,
    7: undefined,
    8: false,
    9: false,
    10: false,
    11: true,
    12: true,
    13: false,
    14: false,
    15: false,
    16: true,
    17: false,
    18: false,
    19: false,
    20: false,
    21: false,
    22: true,
    23: true,
    24: false,
    25: false,
    26: true,
  };

  constructor() {
    TriggerRegisterAnyUnitEventBJ(this.t1, EVENT_PLAYER_UNIT_DAMAGING);
    TriggerAddCondition(
      this.t1,
      Filter(() => {
        const eventDamage = GetEventDamage();
        // FIXME: A bug in wc3 causes a 0.0 damage event when attacking enemy units with initial damage + DOT (ex: Slow Poison, Envenomed Spears, Phoenix Fire)
        // This breaks the damage engine later down the line so this is a hotfix for this bug
        if (eventDamage === 0.0) return;

        const d = this.createFromEvent(eventDamage, false);
        Log.Debug("Pre-damage event running...");
        if (this.isAlarmSet) {
          if (this.totem) {
            // WarCraft 3 didn't run the DAMAGED event despite running the DAMAGING event.
            if (
              d.damageType === DAMAGE_TYPE_SPIRIT_LINK ||
              d.damageType === DAMAGE_TYPE_DEFENSIVE ||
              d.damageType === DAMAGE_TYPE_PLANT ||
              d.damageType === DAMAGE_TYPE_FIRE
            ) {
              this.lastInstance = this.current;
              this.totem = false;
              this.canKick = false;
            } else {
              this.failsafeClear(); // Not an overlapping event - just wrap it up
            }
          } else {
            this.finish(); // wrap up any previous damage index
          }

          if (DamageEngine._USE_EXTRA) {
            if (d.source !== this.originalSource) {
              this.onAOEEnd();
              this.originalSource = d.source;
              this.originalTarget = d.target;
            } else if (d.target === this.originalTarget) {
              this.sourceStacks += 1;
            } else if (!IsUnitInGroup(d.target, DamageEngine.targets)) {
              this.sourceAOE += 1;
            }
          }
        } else {
          this.isAlarmSet = true;
          const t: Timer = TimerUtils.newTimer();
          t.start(0.0, false, () => {
            TimerUtils.releaseTimer(t);
            this.isAlarmSet = false;
            this.isDreaming = false;
            this.enable(true);
            if (this.totem) {
              this.failsafeClear(); // WarCraft 3 didn't run the DAMAGED event despite running the DAMAGING event.
            } else {
              this.canKick = true;
              this.isKicking = false;
              this.finish();
            }
            this.onAOEEnd();
            this.current = null;
            Log.Debug("Timer wrapped up");
          });
          if (DamageEngine._USE_EXTRA) {
            this.originalSource = d.source;
            this.originalTarget = d.target;
          }
        }
        if (DamageEngine._USE_EXTRA) {
          GroupAddUnit(DamageEngine.targets, d.target);
        }
        if (this.doPreEvents(d, true)) {
          this.runEvent(DamageEventType.ZeroDamageEvent);
          this.canKick = true;
          this.finish();
        }
        this.totem =
          !this.lastInstance ||
          this.attacksImmune[d.attackType as unknown as number] ||
          this.damagesImmune[d.damageType as unknown as number] ||
          !IsUnitType(d.target, UNIT_TYPE_MAGIC_IMMUNE);

        return false;
      })
    );

    TriggerRegisterAnyUnitEventBJ(this.t2, EVENT_PLAYER_UNIT_DAMAGED);
    TriggerAddCondition(
      this.t2,
      Filter(() => {
        const r = GetEventDamage();
        let d = this.current;
        Log.Debug("Second damage event running...");
        if (this.prepped) this.prepped = null;
        else if (this.isDreaming || d.prevAmt === 0.0) return;
        else if (this.totem) this.totem = false;
        else {
          this.afterDamage();
          d = this.lastInstance;
          this.current = d;
          this.lastInstance = null;
          this.canKick = true;
        }
        this.setArmor(true);
        d.userAmt = d.damage;
        d.damage = r;

        if (r > 0.0) {
          this.runEvent(DamageEventType.ArmorDamageEvent);
          if (DamageEngine.HAS_LETHAL || d.userType < 0) {
            this.current.life = GetWidgetLife(d.target) - d.damage;
            if (this.current.life <= DamageEngine._DEATH_VAL) {
              if (DamageEngine.HAS_LETHAL) {
                this.runEvent(DamageEventType.LethalDamageEvent);
                d.damage = GetWidgetLife(d.target) - this.current.life;
              }
              if (
                d.userType < 0 &&
                this.current.life <= DamageEngine._DEATH_VAL
              ) {
                SetUnitExploded(d.target, true);
              }
            }
          }
        }
        if (d.damageType !== DAMAGE_TYPE_UNKNOWN)
          this.runEvent(DamageEventType.OnDamageEvent);
        BlzSetEventDamage(d.damage);
        this.isEventsRun = true;
        if (d.damage === 0.0) this.finish();

        return false;
      })
    );

    TriggerRegisterAnyUnitEventBJ(this.t3, EVENT_PLAYER_UNIT_DAMAGING);
    TriggerAddCondition(
      this.t3,
      Filter(() => {
        this.addRecursive(this.createFromEvent(GetEventDamage(), true));
        BlzSetEventDamage(0.0);

        return false;
      })
    );
    DisableTrigger(this.t3);
  }

  // Call to enable recursive damage on your trigger.
  public inception() {
    this.userIndex.inceptionTrig = true;
  }

  /**
   * add a recursive damage instance
   *
   * @param {DamageInstance} d
   */
  private addRecursive(d: DamageInstance): void {
    if (d.damage !== 0.0) {
      d.recursiveFunc = this.userIndex;
      if (
        this.isKicking &&
        this.proclusGlobal[d.source as any] &&
        this.fischerMorrow[d.target as any]
      ) {
        if (!this.userIndex.inceptionTrig) {
          this.userIndex.trigFrozen = true;
        } else if (
          !this.userIndex.trigFrozen &&
          this.userIndex.levelsDeep < this.sleepLevel
        ) {
          this.userIndex.levelsDeep += 1;
          this.userIndex.trigFrozen =
            this.userIndex.levelsDeep >= DamageEngine._LIMBO;
        }
      }

      this.recursiveStack.push(d);
      Log.Debug(
        `recursiveStack: ${this.recursiveStack.length} levelsDeep: ${this.userIndex.levelsDeep} sleepLevel: ${this.sleepLevel}`
      );
    }
  }

  private static DAMAGE_INSTANCE_TRANSFORMER: TransformerFunc;
  public static registerTransformer(transformer: TransformerFunc): void {
    this.DAMAGE_INSTANCE_TRANSFORMER = transformer;
  }

  /**
   * register a new damage event
   *
   * @param {DamageEvent} damageEvent
   * @param {DamageEventType} eventType
   * @param {number} filt
   */
  public static register(
    damageEvent: DamageEvent,
    eventType: DamageEventType,
    filt?: number
  ): void {
    if (eventType === DamageEventType.AoeDamageEvent) {
      DamageEngine.HAS_SOURCE = true;
    } else if (eventType === DamageEventType.LethalDamageEvent) {
      DamageEngine.HAS_LETHAL = true;
    }

    filt = filt || this._FILTER_OTHER;

    const filters = {};
    if (filt === this._FILTER_OTHER) {
      filters[this._FILTER_ATTACK] = true;
      filters[this._FILTER_MELEE] = true;
      filters[this._FILTER_OTHER] = true;
      filters[this._FILTER_RANGED] = true;
      filters[this._FILTER_SPELL] = true;
      filters[this._FILTER_CODE] = true;
    } else if (filt === this._FILTER_ATTACK) {
      filters[this._FILTER_ATTACK] = true;
      filters[this._FILTER_MELEE] = true;
      filters[this._FILTER_RANGED] = true;
    } else {
      filters[filt] = true;
    }

    this.EVENTS[eventType].push({
      filters,
      levelsDeep: 0,
      damageEvent: damageEvent,
    });

    Log.Debug(`Registered new event to ${damageEvent.constructor.name}`);
  }

  // FIXME: Implement Damage.apply from line:798

  // FIXME: Implement Damage.applySpell from line:816

  // FIXME: Implement Damage.applyAttack from line:819
}
