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
CubeEditor.update = function update() {
    Controls.update();
}

function onMouseDown(event) {
    event.preventDefault();

    const intersects = CubeEditor.rayCaster.intersectObjects(CubeEditor.voxelObjects);
    if (intersects.length > 0) {
        const intersect = intersects[0];

        if (event.button === LEFT_MOUSE_BTN && isShiftDown) {
            CubeEditor.add(intersect, 1);
        }
        else if (event.button === RIGHT_MOUSE_BTN && intersect.object !== CubeEditor.plane) {
            CubeEditor.remove(intersect);
        }
    }
}

function onKeyDown(event) {
    if (event.keyCode === 16) {
        isShiftDown = true;
    }
}

function onKeyUp(event) {
    if (event.keyCode === 16) {
        isShiftDown = false;
    }
}

document.addEventListener("mousedown", onMouseDown, false);
document.addEventListener("keydown", onKeyDown, false);
document.addEventListener("keyup", onKeyUp, false);
