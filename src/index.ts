// Three.js Dependencies
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Third-party Dependencies
import * as dat from 'dat.gui';
import { readFileSync } from "fs";

// Internal Dependencies
import CellularAutomata from "./cellular-automata";
import { NoiseMap, TerrainType } from "./noise-map";
import { EvolutionThree, ModelLoader } from "./framework/index";

// Load regions
const regionsStr = readFileSync("./src/regions.json", "utf-8");
const regions: TerrainType[] = JSON.parse(regionsStr);

const game = new EvolutionThree();

// Initialize Camera & Controls
game.camera.position.set(0, 100, 0);
game.camera.lookAt(0, 0, 0);

const controls = new OrbitControls(game.camera, game.renderer.domElement);
game.on("update", () => {
    controls.update();
});

async function generate() {
    game.cleanScene();
    const loader = new ModelLoader({
        modelsPath: "./assets/models/",
        texturePath: "./assets/textures/"
    });

    if (this.type === "cellular-automata") {
        const generator = new CellularAutomata(this.width, this.height, {
            chanceToStartAlive: this.chanceToStartAlive,
            connectionsRadius: this.connectionsRadius
        });
        for (const cube of generator.initMap(this.simulationSteps)) {
            game.currentScene.add(cube);
        }

        for (const pos of generator.getRandomVectorInMap(0.005)) {
            const treeNum = `tree${Math.floor(Math.random() * 3) + 1}`;
            const model = await loader.load(treeNum, `${treeNum}.png`);
            model.scale.set(0.7, 0.7, 0.7);
            model.position.set(pos.x, pos.y + 0.8, pos.z);
            game.currentScene.add(model);
        }

        for (const pos of generator.getRandomVectorInMap(0.002)) {
            const model = await loader.load("lampadaire", "lampadaire.png");
            model.position.set(pos.x, pos.y + 1, pos.z);

            const light = new THREE.PointLight("#FFF9C4", 2, 30);
            light.position.set(pos.x, pos.y, pos.z);
            game.currentScene.add(light);

            game.currentScene.add(model);
        }
    }
    else {
        const generator = new NoiseMap(this.width, this.height);
        generator.regions.push(...regions);

        const it = generator.initMap({
            scale: this.scale,
            octaves: this.octaves,
            lacunarity: this.lacunarity,
            persistance: this.persistance
        });
        for (const cube of it) {
            game.currentScene.add(cube);
        }
    }

    game.currentScene.add(new THREE.AmbientLight(0xffffff, 0.4));
    game.currentScene.add(new THREE.DirectionalLight(0xffffff, 0.8));
}

window.onload = () => {
    const options = {
        type: "cellular-automata",
        width: 50,
        height: 50,
        simulationSteps: 12,
        chanceToStartAlive: 0.55,
        voidRegionThreshold: 50,
        groundRegionThreshold: 50,
        connectionsRadius: 3,
        scale: 24,
        octaves: 20,
        lacunarity: 1,
        persistance: 1,
        generate
    };

    const gui = new dat.GUI({ load: JSON });
    gui.remember(options);
    gui.add(options, "type", ["cellular-automata", "noise-map"]);
    gui.add(options, "width", 10, 500);
    gui.add(options, "height", 10, 500);

    const cellular = gui.addFolder("Cellular Automata");
    cellular.add(options, "simulationSteps", 2, 20);
    cellular.add(options, "chanceToStartAlive", 0, 1);
    cellular.add(options, "voidRegionThreshold", 1, 250);
    cellular.add(options, "groundRegionThreshold", 1, 250);
    cellular.add(options, "connectionsRadius", 1, 6).step(1);
    cellular.open();

    const noise = gui.addFolder("Noise Map");
    noise.add(options, "scale", 0.0001, 500);
    noise.add(options, "octaves", 1, 100);
    noise.add(options, "lacunarity", 1, 100);
    noise.add(options, "persistance", 1, 100);
    noise.open();

    gui.add(options, "generate");
}
