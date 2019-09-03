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

const generator = new MapGenerator(50);
for (const cube of generator.initMap()) {
    scene.add(cube);
}

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

