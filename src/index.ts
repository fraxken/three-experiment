import * as THREE from "three";
import "three/OrbitControls";

/**
 * Create Renderer
 */
const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});
document.body.appendChild(renderer.domElement);

/**
 * Setup and configure Camera
 */
const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
console.log(THREE.OrbitControls);
const controls = new THREE.OrbitControls(camera);
camera.position.set( 0, 20, 100 );
controls.update();

const scene = new THREE.Scene();

// Add cube
const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const material = new THREE.MeshNormalMaterial();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
scene.add(new THREE.GridHelper(100, 100));

/**
 * Animate and render scene
 */
function animate() {
    requestAnimationFrame(animate);

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    controls.update();
    renderer.render(scene, camera);
}
animate();
