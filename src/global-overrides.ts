const oldFourCC = FourCC;
globalThis["FourCC"] = (id: string) => {
  const a: number = oldFourCC(id);
  return a;
};
