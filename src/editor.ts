import * as THREE from "three";

class Editor {
    public renderer: THREE.WebGLRenderer;
    public camera: THREE.PerspectiveCamera;
    public mouse = new THREE.Vector2();
    public rayCaster = new THREE.Raycaster();
    public voxelObjects: any[];
    public rollOver: THREE.LineSegments;
    public scene = new THREE.Scene();
    public plane: THREE.Mesh;

    public static cubeGeo = new THREE.BoxBufferGeometry(50, 50, 50);
    public static cubeMaterial = new THREE.MeshNormalMaterial();

    constructor() {
        // Initialize Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Initialize Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
        this.camera.position.set(500, 800, 1300);
        this.camera.lookAt(0, 0, 0);

        // Inner objects
        this.voxelObjects = [];

        // Setup listeners
        document.addEventListener("resize", (event) => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.initialize();
        const animate = () => {
            requestAnimationFrame(animate);
            this.renderer.render(this.scene, this.camera);
        }
        animate();
    }

    initialize() {
        // Roll-over helpers
        const rollOverGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(50, 50, 50));
        const rollOverMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 200 });
        this.rollOver = new THREE.LineSegments(rollOverGeo, rollOverMaterial)
        this.rollOver.renderOrder = 0;
        this.rollOver.position.set(0, 0, 0);

        // Editor Lights
        const ambientLight = new THREE.AmbientLight(0x606060);
        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(1, 0.75, 0.5).normalize();

        // Editor base plane
        const planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000);
        planeGeometry.rotateX(-Math.PI / 2);
        this.plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ visible: false }));

        // Add objects to scene
        this.scene.add(this.plane);
        this.scene.add(this.rollOver);
        this.scene.add(directionalLight);
        this.scene.add(ambientLight);
        this.scene.add(new THREE.GridHelper(1000, 20));

        // Add voxel objects
        this.voxelObjects.push(this.plane);

        // Add listeners
        document.addEventListener("mousemove", (event) => {
            event.preventDefault();
            this.mouse.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            this.rayCaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.rayCaster.intersectObjects(this.voxelObjects);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                this.rollOver.position.copy(intersect.point).add(intersect.face.normal);
                this.rollOver.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
            }
        });
    }
}

export default Editor;
