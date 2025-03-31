export const FourCCToString = (n: number) => {
  let s = "";
  let i = n;
  while (i > 0) {
    s += String.fromCharCode(i & 0xff);
    i = Math.floor(i / 256);
  }
  return s.split("").reverse().join("");
};
