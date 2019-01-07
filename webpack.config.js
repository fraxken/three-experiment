const { resolve, join } = require('path');
const webpack = require("webpack");

// CONSTANTS
const BUILD = resolve(__dirname, "build");
const THREE_EX = join(__dirname, "node_modules/three/examples/js");

module.exports = {
    entry: join(BUILD, "index.js"),
    mode: "none",
    optimization: {
        usedExports: true
    },
    output: {
        filename: "bundle.js",
        path: resolve(__dirname, "dist")
    },
    resolve: {
        alias: {
            "three/OrbitControls": join(THREE_EX, "controls/OrbitControls.js")
        }
    },
    plugins:[
        new webpack.ProvidePlugin({
            THREE: "three"
        })
    ]
};
