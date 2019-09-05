// Three.js Dependencies
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Internal Dependencies
import CellularAutomata from "./cellular-automata";
import { NoiseMap } from "./noise-map";
import { EvolutionThree, ModelLoader } from "./framework/index";

const game = new EvolutionThree();

// Initialize Camera & Controls
game.camera.position.set(0, 100, 0);
game.camera.lookAt(0, 0, 0);

const controls = new OrbitControls(game.camera, game.renderer.domElement);
game.on("update", () => {
    controls.update();
});

const loader = new ModelLoader({
    modelsPath: "./assets/models/",
    texturePath: "./assets/textures/"
});

const eGenerate = document.getElementById("generate");
eGenerate.addEventListener("click", async() => {
    game.cleanScene();

    // const [scale, octaves, lacunarity, persistance] = [
    //     getInputValue("width"),
    //     getInputValue("height"),
    //     getInputValue("steps"),
    //     getInputValue("alive")
    // ];

    // const generator = new NoiseMap(100, 100);
    // generator.regions.push({
    //     name: "WaterDeep",
    //     color: "#1565C0",
    //     height: 0.3
    // });
    // generator.regions.push({
    //     name: "Water",
    //     color: "#1976D2",
    //     height: 0.4
    // });
    // generator.regions.push({
    //     name: "Sand",
    //     color: "#FFF176",
    //     height: 0.5
    // });
    // generator.regions.push({
    //     name: "Grass",
    //     color: "#7CB342",
    //     height: 0.55
    // });
    // generator.regions.push({
    //     name: "Grass2",
    //     color: "#558B2F",
    //     height: 0.65
    // });
    // generator.regions.push({
    //     name: "Rock",
    //     color: "#4E342E",
    //     height: 0.75
    // });
    // generator.regions.push({
    //     name: "DeepRock",
    //     color: "#3E2723",
    //     height: 1
    // });

    // const it = generator.initMap({
    //     scale,
    //     octaves,
    //     lacunarity,
    //     persistance
    // });
    // for (const cube of it) {
    //     scene.add(cube);
    // }

    const [width, height, steps, chanceToStartAlive] = [
        getInputValue("width"),
        getInputValue("height"),
        getInputValue("steps"),
        getInputValue("alive")
    ];

    const generator = new CellularAutomata(width, height, {
        chanceToStartAlive
    });
    for (const cube of generator.initMap(steps)) {
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // soft white light
    game.currentScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    game.currentScene.add(directionalLight);
});

function getInputValue(name: string): number {
    return Number((<HTMLInputElement>document.getElementById(name)).value);
}
