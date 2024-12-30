export { };

declare global {
    function MathRound(v: number): number;
}

global.MathRound = function MathRound(v: number) {
    return Math.round(v);
};

global.print = (...args: any[]) => {
    if (process.env.SILENT_MODE !== "true") {
        console.log(...args);
    }
};
