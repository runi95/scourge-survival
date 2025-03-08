export const levelUpStr = (
  level: number,
  mult: number = 1,
  baseValue: number = 0,
  keepColor: boolean = false
) =>
  `${
    level > 1
      ? `|cff808080${(level - 1) * mult + baseValue}|r => |cffffcc00${
          level * mult + baseValue
        }${keepColor ? "" : "|r"}`
      : `|cffffcc00${level * mult + baseValue}${keepColor ? "" : "|r"}`
  }`;
