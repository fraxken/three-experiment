import * as THREE from "three";
import Editor from "./editor";
import "three/OrbitControls";

// CONSTANTS
const LEFT_MOUSE_BTN = 0;
const RIGHT_MOUSE_BTN = 2;

// GLOBALS
let isShiftDown = false;

const CubeEditor = new Editor();
const Controls = new THREE.OrbitControls(CubeEditor.camera);

CubeEditor.initialize();
Controls.update();

function onMouseDown(event) {
    event.preventDefault();

    const intersects = CubeEditor.rayCaster.intersectObjects(CubeEditor.voxelObjects);
    if (intersects.length > 0) {
        const intersect = intersects[0];

        if (event.button === LEFT_MOUSE_BTN && isShiftDown) {
            var voxel = new THREE.Mesh(Editor.cubeGeo, Editor.cubeMaterial);
            voxel.position.copy(intersect.point).add(intersect.face.normal);
            voxel.position.divideScalar(50).floor().multiplyScalar(50 ).addScalar(25);

            CubeEditor.scene.add(voxel);
            CubeEditor.voxelObjects.push(voxel);
        }
        else if (event.button === RIGHT_MOUSE_BTN && intersect.object !== CubeEditor.plane) {
            CubeEditor.scene.remove(intersect.object);
            CubeEditor.voxelObjects.splice(CubeEditor.voxelObjects.indexOf(intersect.object), 1);
        }
    }
}

function onKeyDown(event) {
    if (event.keyCode === 16) {
        isShiftDown = !isShiftDown;
    }
}

document.addEventListener("mousedown", onMouseDown, false);
document.addEventListener("keydown", onKeyDown, false);
document.addEventListener("keyup", onKeyDown, false);
