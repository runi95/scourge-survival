export default {
    files: [
        "test/**/*.test.ts",
        "!test/overrides"
    ],
    extensions: [
        "ts"
    ],
    require: [
        "ts-node/register/transpile-only"
    ]
};
