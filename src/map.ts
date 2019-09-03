import * as THREE from "three";

export default class MapGenerator {
    static chanceToStartAlive: number = 0.50;
    static birthLimit: number = 4;
    static deathLimit: number = 4;
    static cubeWidth: number = 50;
    static defaultYPos: number = 0;
    static surroundElimination: number = 3;

    static mainColor = "#4CAF50";
    static borderColor = "#66BB6A";

    private width: number;
    private height: number;
    private map: number[][] = [];

    constructor(width: number, height: number = width) {
        this.width = width;
        this.height = height;
        const limit: number = MapGenerator.surroundElimination;

        for (let x = 0; x < this.width; x++) {
            this.map[x] = [];
            for (let z = 0; z < this.height; z++) {
                // This first if avoid creating block around (avoid the 'cubic' effect)
                if (x <= limit || x >= this.width - limit || z <= limit || z >= this.height - limit) {
                    this.map[x][z] = 0;
                }
                else {
                    this.map[x][z] = Math.random() > MapGenerator.chanceToStartAlive ? 0 : 1;
                }
            }
        }
    }

    public *initMap(nbSteps: number = 8): IterableIterator<THREE.Mesh> {
        while (nbSteps--) {
            this.doSimulationStep();
        }
        this.cleanInnerIsolated();
        this.applyNeighboursCost();

        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                if (this.map[x][z] === 0) {
                    const mesh = new THREE.Mesh(
                        new THREE.BoxBufferGeometry(MapGenerator.cubeWidth, MapGenerator.cubeWidth, MapGenerator.cubeWidth),
                        new THREE.MeshPhongMaterial({ color: "#1976D2", opacity: 0.75 })
                    );
                    mesh.receiveShadow = true;
                    mesh.castShadow = true;
                    mesh.position.set(x * MapGenerator.cubeWidth, MapGenerator.defaultYPos - 25, z * MapGenerator.cubeWidth);

                    yield mesh;
                }
                else {
                    const color = this.map[x][z] <= 7 ? MapGenerator.borderColor : MapGenerator.mainColor;
                    const mesh = new THREE.Mesh(
                        new THREE.BoxBufferGeometry(MapGenerator.cubeWidth, MapGenerator.cubeWidth, MapGenerator.cubeWidth),
                        new THREE.MeshPhongMaterial({ color })
                    );
                    mesh.receiveShadow = true;
                    mesh.castShadow = true;
                    mesh.position.set(x * MapGenerator.cubeWidth, MapGenerator.defaultYPos, z * MapGenerator.cubeWidth);

                    yield mesh;
                }
            }
        }
    }

    private doSimulationStep(): void {
        const newMap: number[][] = [];

        for (let x = 0; x < this.width; x++) {
            newMap[x] = [];
            for(let z = 0; z < this.height; z++) {
                const nAlive = this.getSurroundingNeighboursCount(x, z);

                if (nAlive > 4) {
                    newMap[x][z] = 0;
                }
                else {
                    newMap[x][z] = 1;
                }

                // if (this.map[x][z]) {
                //     newMap[x][z] = nAlive < MapGenerator.deathLimit ? 1 : 0;
                // }
                // else {
                //     newMap[x][z] = nAlive > MapGenerator.birthLimit ? 0 : 1;
                // }
            }
        }

        this.map = newMap;
    }

    private getSurroundingNeighboursCount(x: number, y: number): number {
        let count: number = 0;

        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                const nbX: number = x + i;
                const nbZ: number = y + j;

                if (i === 0 && j === 0) {
                    continue;
                }
                else if(nbX < 0 || nbZ < 0 || nbX >= this.width || nbZ >= this.height){
                    count++;
                }
                else if(this.map[nbX][nbZ] > 0){
                    count++;
                }
            }
        }

        return count;
    }

    private cleanInnerIsolated(): void {
        for (let x = 0; x < this.map.length; x++) {
            for(let z = 0; z < this.map[0].length; z++) {
                if (this.map[x][z] === 1) {
                    continue;
                }

                const nAlive = this.getSurroundingNeighboursCount(x, z);
                if (nAlive === 8) {
                    this.map[x][z] = 1;
                }
            }
        }
    }

    private applyNeighboursCost(): void {
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                if (this.map[x][z] === 0) {
                    continue;
                }

                this.map[x][z] = this.getSurroundingNeighboursCount(x, z);
            }
        }
    }
}
