import * as THREE from "three";

interface CellularOptions {
    chanceToStartAlive?: number;
    borderWidth?: number;
    cubeWidth?: number;
}

interface Coord {
    x: number;
    y: number;
}

type Color = string | number | THREE.Color;

export default class CellularAutomata {
    static defaultYPos: number = 0;
    static mainColor: Color = "#4CAF50";
    static borderColor: Color = "#66BB6A";
    static waterColor: Color = "#1976D2";

    private width: number;
    private height: number;
    private cubeWidth: number;
    private map: number[][] = [];

    constructor(width: number, height: number = width, options?: CellularOptions) {
        this.width = width;
        this.height = height;
        this.cubeWidth = options.cubeWidth || 50;

        const chanceToStartAlive = options.chanceToStartAlive || 0.58;
        const borderWidth = options.borderWidth || 2;
        const maxWidth = this.width - borderWidth;
        const maxHeight = this.height - borderWidth;
        for (let x = 0; x < this.width; x++) {
            this.map[x] = [];
            for (let z = 0; z < this.height; z++) {
                // This first if avoid creating block around (avoid the 'cubic' effect)
                if (x <= borderWidth || x >= maxWidth || z <= borderWidth || z >= maxHeight) {
                    this.map[x][z] = 0;
                }
                else {
                    this.map[x][z] = Math.random() > chanceToStartAlive ? 0 : 1;
                }
            }
        }
    }

    private createCube(color: Color, opacity: number = 1) {
        const mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(this.cubeWidth, this.cubeWidth, this.cubeWidth),
            new THREE.MeshPhongMaterial({ color, opacity })
        );
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        return mesh;
    }

    public *initMap(nbSteps: number = 8): IterableIterator<THREE.Mesh> {
        while (nbSteps--) {
            this.doSimulationStep();
        }
        this.processMap();
        this.cleanInnerIsolated();
        this.applyNeighboursCost();

        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                let mesh: THREE.Mesh;
                if (this.map[x][z] === 0) {
                    mesh = this.createCube("#1976D2", 0.75);
                    mesh.position.set(x * this.cubeWidth, CellularAutomata.defaultYPos - 25, z * this.cubeWidth);
                }
                else {
                    const color = this.map[x][z] <= 7 ? CellularAutomata.borderColor : CellularAutomata.mainColor;
                    mesh = this.createCube(color);
                    mesh.position.set(x * this.cubeWidth, CellularAutomata.defaultYPos, z * this.cubeWidth);
                }
                yield mesh;
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
                else if(!this.isInMapRange(nbX, nbZ)){
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

    private processMap(): void {
        const groundRegions = this.getRegions(1);
        const groundThreshold = 50;

        for (const region of groundRegions) {
            if (region.size < groundThreshold) {
                for (const tile of region) {
                    this.map[tile.x][tile.y] = 0;
                }
            }
        }
    }

    private isInMapRange(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    static initMapFlags(width: number, height: number): number[][] {
        const mapFlags: number[][] = [];

        for (let x = 0; x < width; x++) {
            mapFlags[x] = [];
            for (let y = 0; y < height; y++) {
                mapFlags[x][y] = 0;
            }
        }

        return mapFlags;
    }

    private getRegions(type: number): Set<Set<Coord>> {
        const regions = new Set<Set<Coord>>();
        const mapFlags = CellularAutomata.initMapFlags(this.width, this.height);

        for (let x = 0; x < this.width; x++) {
            for(let y = 0; y < this.height; y++) {
                if (mapFlags[x][y] === 0 && this.map[x][y] === type) {
                    const newRegion = this.getRegionTiles(x, y, type);
                    regions.add(newRegion);

                    for (const tile of newRegion.values()) {
                        mapFlags[tile.x][tile.y] = 1;
                    }
                }
            }
        }

        return regions;
    }

    private getRegionTiles(startX: number, startY: number, type: number): Set<Coord> {
        const tiles = new Set<Coord>();
        const mapFlags = CellularAutomata.initMapFlags(this.width, this.height);

        const queue: Coord[] = [{ x: startX, y: startY }];
        mapFlags[startX][startY] = 1;

        while (queue.length > 0) {
            const tile = queue.shift();
            tiles.add(tile);

            for (let x = tile.x - 1; x <= tile.x + 1; x++) {
                for (let y = tile.y - 1; y <= tile.y + 1; y++) {
                    if (this.isInMapRange(x, y) && (x === tile.x || y === tile.y) && mapFlags[x][y] === 0 && this.map[x][y] === type) {
                        mapFlags[x][y] = 1;
                        queue.push({ x, y });
                    }
                }
            }
        }

        return tiles;
    }
}
