import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

import CellularAutomata from "./cellular-automata";

const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

// Initialize Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();
camera.position.set(0, 100, 0);
camera.lookAt(0, 0, 0);

// Scene
const scene = new THREE.Scene();

const textureLoader = new THREE.TextureLoader();
textureLoader.setPath("./assets/models/")
const objLoader = new OBJLoader();
objLoader.setPath("./assets/models/");

function loadTexture(name): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        textureLoader.load(name, resolve, void 0, reject);
    });
}

function loadModel(modelName): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        objLoader.load(`${modelName}.obj`, resolve, void 0, reject);
    });
}

async function getCompleteModel(name) {
    const [map, obj] = await Promise.all([
        loadTexture(`${name}.png`),
        loadModel(name)
    ]);
    const material = new THREE.MeshPhongMaterial({ map });
    obj.traverse((node) => {
        // @ts-ignore
        if (node.isMesh) {
            // @ts-ignore
            node.material = material;
        }
    });

    return obj;
}

const eGenerate = document.getElementById("generate");
eGenerate.addEventListener("click", async() => {
    while(scene.children.length > 0){
        scene.remove(scene.children[0]);
    }

    const [width, height, steps, chanceToStartAlive] = [
        getInputValue("width"),
        getInputValue("height"),
        getInputValue("steps"),
        getInputValue("alive")
    ];

    const generator = new CellularAutomata(width, height, {
        chanceToStartAlive,
        scene
    });
    for (const cube of generator.initMap(steps)) {
        scene.add(cube);
    }

    for (const pos of generator.getRandomVectorInMap(0.005)) {
        const treeNum = Math.floor(Math.random() * 3) + 1;
        const model = await getCompleteModel(`tree${treeNum}`);
        model.scale.set(0.7, 0.7, 0.7);
        model.position.set(pos.x, pos.y + 0.8, pos.z);
        scene.add(model);
    }

    for (const pos of generator.getRandomVectorInMap(0.002)) {
        const model = await getCompleteModel("lampadaire");
        model.position.set(pos.x, pos.y + 1, pos.z);

        const light = new THREE.PointLight("#FFF9C4", 2, 30);
        light.position.set(pos.x, pos.y, pos.z);
        scene.add(light);

        scene.add(model);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    scene.add(directionalLight);
});

function updateSize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function getInputValue(name: string): number {
    return Number((<HTMLInputElement>document.getElementById(name)).value);
}

updateSize();
animate();
window.onresize = () => updateSize();

