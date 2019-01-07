const { resolve, join } = require('path');
const webpack = require("webpack");

// CONSTANTS
const SRC = resolve(__dirname, "src");
const BUILD = resolve(__dirname, "build");

module.exports = {
    entry: [
        join(BUILD, "index.js"),
        join(SRC, "OrbitControls.js")
    ],
    mode: "none",
    output: {
        filename: "bundle.js",
        path: resolve(__dirname, "dist")
    },
    plugins: [
        new webpack.DefinePlugin({
            THREE: require.resolve("three")
        })
    ]
};
