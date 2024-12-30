export const frames: Frame[] = [];

export class Frame {
  public readonly name: string;
  public readonly priority: number;
  public readonly createContext?: number;
  public readonly typeName?: string;
  public readonly inherits?: string;

  public parent: Frame;
  public visible: boolean;
  public width: number = 0;
  public height: number = 0;
  public value: number;
  public enabled: boolean;
  public text: string;

  private _texFile: string;
  private _flag: number;
  private _blend: boolean;
  private _scale: number;
  private _modelFile: string;
  private _cameraIndex: number;
  private _point: framepointtype;
  private _x: number;
  private _y: number;
  private _relative: Frame;
  private _relativePoint: framepointtype;
  private _tooltip: Frame;

  constructor(name: string, owner: Frame, priority: number, createContext?: number, typeName?: string, inherits?: string) {
    this.name = name;
    this.parent = owner;
    this.priority = priority;
    this.createContext = createContext;
    this.typeName = typeName;
    this.inherits = inherits;

    frames.push(this);
  }

  public static fromHandle(handle: { name: string, owner: Frame, priority: number, createContext?: number, typeName?: string, inherits?: string }): Frame {
    return new this(handle.name, handle.owner, handle.priority, handle.createContext, handle.typeName, handle.inherits);
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;

    return this;
  }

  public setTexture(texFile: string, flag: number, blend: boolean) {
    this._texFile = texFile;
    this._flag = flag;
    this._blend = blend;

    return this;
  }

  public setScale(scale: number) {
    this._scale = scale;

    return this;
  }

  public setValue(value: number) {
    this.value = value;

    return this;
  }

  public setVisible(flag: boolean) {
    this.visible = flag;

    return this;
  }

  public setModel(modelFile: string, cameraIndex: number) {
    this._modelFile = modelFile;
    this._cameraIndex = cameraIndex;

    return this;
  }

  public setAbsPoint(point: framepointtype, x: number, y: number) {
    this._point = point;
    this._x = x;
    this._y = y;

    return this;
  }

  public setParent(parent: Frame) {
    this.parent = parent;

    return this;
  }

  public setPoint(point: framepointtype, relative: Frame, relativePoint: framepointtype, x: number, y: number) {
    this._point = point;
    this._relative = relative;
    this._relativePoint = relativePoint;
    this._x = x;
    this._y = y;

    return this;
  }

  public setTooltip(tooltip: Frame) {
    this._tooltip = tooltip;

    return this;
  }

  public setEnabled(flag: boolean) {
    this.enabled = flag;

    return this;
  }

  public setText(text: string) {
    this.text = text;

    return this;
  }

  public get texFile(): string {
    return this._texFile;
  }

  public get flag(): number {
    return this._flag;
  }

  public get blend(): boolean {
    return this._blend;
  }

  public get scale(): number {
    return this._scale;
  }

  public get modelFile(): string {
    return this._modelFile;
  }

  public get cameraIndex(): number {
    return this._cameraIndex;
  }

  public get point(): string {
    return this._point;
  }

  public get x(): number {
    return this._x;
  }

  public get y(): number {
    return this._y;
  }

  public get relative(): Frame {
    return this._relative;
  }

  public get relativePoint(): string {
    return this._relativePoint;
  }

  public get tooltip(): Frame {
    return this._tooltip;
  }
}
