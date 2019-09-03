import * as THREE from "three";
import MapGenerator from "./map";
import "three/OrbitControls";

const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
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

    // @ts-ignore
    const width = document.getElementById("width").value;

    // @ts-ignore
    const height = document.getElementById("height").value;

    // @ts-ignore
    const steps = document.getElementById("steps").value;

    // @ts-ignore
    const alive = document.getElementById("alive").value;
    MapGenerator.chanceToStartAlive = alive;

    const generator = new MapGenerator(width, height);
    for (const cube of generator.initMap(steps)) {
        scene.add(cube);
    }
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

updateSize();
animate();
window.onresize = () => updateSize();

