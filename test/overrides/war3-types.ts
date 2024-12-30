export { };

declare global {
    function FourCC(str: string): number;
    type region = any;
    type boolexpr = any;
    type event = any;
}

global.FourCC = function FourCC(str: string) {
    return 0;
};
