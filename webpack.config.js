// Require Node.js Dependencies
const { join } = require("path");

// Require Third-party Dependencies
const webpack = require("webpack");

// CONSTANTS
const BUILD = join(__dirname, "build");
const THREE_EX = join(__dirname, "node_modules/three/examples/js");

module.exports = {
    entry: [
        "index.js", "cellular-automata.js"
    ].map((rel) => join(BUILD, rel)),
    mode: "none",
    optimization: {
        usedExports: true
    },
    output: {
        filename: "bundle.js",
        path: join(__dirname, "dist")
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
