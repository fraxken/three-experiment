// Node.js Dependencies
import * as events from "events";
import { extname } from "path";

// Three Dependencies
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

export class EvolutionThree extends events {
    public renderer: THREE.WebGLRenderer;
    public currentScene: THREE.Scene = new THREE.Scene();
    public camera: THREE.PerspectiveCamera;

    constructor() {
        super();
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);

        document.body.appendChild(this.renderer.domElement);

        const animate = () => {
            requestAnimationFrame(animate);
            this.emit("update");
            this.renderer.render(this.currentScene, this.camera);
        }

        this.updateSize();
        animate();
        window.onresize = () => this.updateSize();
    }

    cleanScene() {
        while(this.currentScene.children.length > 0) {
            this.currentScene.remove(this.currentScene.children[0]);
        }
    }

    updateSize(): void {
        this.emit("resize");
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

interface ModelLoaderOptions {
    modelsPath: string;
    texturePath: string;
}

export class ModelLoader {
    public textureLoader: THREE.TextureLoader;
    public objLoader: OBJLoader;

    constructor(options: ModelLoaderOptions) {
        this.textureLoader = new THREE.TextureLoader();
        this.objLoader = new OBJLoader();

        this.textureLoader.setPath(options.texturePath)
        this.objLoader.setPath(options.modelsPath);
    }

    private loadTexture(name): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(name, resolve, void 0, reject);
        });
    }

    private loadObject(modelName): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            const objName = extname(modelName) === ".obj" ? modelName : `${modelName}.obj`;
            this.objLoader.load(objName, resolve, void 0, reject);
        });
    }

    async load(objName: string, textureName: string = objName): Promise<THREE.Group> {
        const [map, obj] = await Promise.all([
            this.loadTexture(textureName),
            this.loadObject(objName)
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
}
