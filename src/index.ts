import * as THREE from "three";
import CellularAutomatia from "./cellularautomatia";
import "three/OrbitControls";

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

// @ts-ignore
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();
camera.position.set(500, 800, 1300);
camera.lookAt(0, 0, 0);

// Scene
const scene = new THREE.Scene();

const eGenerate = document.getElementById("generate");
eGenerate.addEventListener("click", () => {
    while(scene.children.length > 0){
        scene.remove(scene.children[0]);
    }

    const [width, height, steps, chanceToStartAlive] = [
        getInputValue("width"),
        getInputValue("height"),
        getInputValue("steps"),
        getInputValue("alive")
    ];

    const generator = new CellularAutomatia(width, height, {
        chanceToStartAlive
    });
    for (const cube of generator.initMap(steps)) {
        scene.add(cube);
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

