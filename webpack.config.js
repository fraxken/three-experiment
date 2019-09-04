// Require Node.js Dependencies
const { join } = require("path");

// Require Third-party Dependencies
const webpack = require("webpack");

// CONSTANTS
const BUILD = join(__dirname, "build");

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
    plugins:[
        new webpack.ProvidePlugin({ THREE: "three" })
    ]
};
