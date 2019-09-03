import * as THREE from "three";
import Room from "./room";

interface CellularOptions {
    chanceToStartAlive?: number;
    borderWidth?: number;
    cubeWidth?: number;
    scene: THREE.Scene;
}

export interface Coord {
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
    private scene: THREE.Scene;

    constructor(width: number, height: number = width, options: CellularOptions) {
        this.width = width;
        this.height = height;
        this.cubeWidth = options.cubeWidth || 50;
        this.scene = options.scene;

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
        // Cleanup ground
        const groundRegions = this.getRegions(1);
        const groundThreshold = 50;
        const survivingRooms = new Set<Room>();

        for (const region of groundRegions) {
            if (region.size < groundThreshold) {
                for (const tile of region) {
                    this.map[tile.x][tile.y] = 0;
                }
            }
            else {
                survivingRooms.add(new Room(region, this.map));
            }
        }

        // Cleanup water
        const waterRegions = this.getRegions(0);
        const waterThreshold = 50;

        for (const region of waterRegions) {
            if (region.size < waterThreshold) {
                for (const tile of region) {
                    this.map[tile.x][tile.y] = 1;
                }
            }
        }

        this.connectClosestRooms(survivingRooms);
    }

    private connectClosestRooms(allRooms: Set<Room>): void {
        let bestDistance = 0;
        let possibleConnectionFound = false;
        let bestTileA: Coord;
        let bestTileB: Coord;
        let bestRoomA: Room;
        let bestRoomB: Room;

        for (const roomA of allRooms) {
            possibleConnectionFound = false;

            for (const roomB of allRooms) {
                if (roomA === roomB) {
                    continue;
                }
                if (roomA.isConnected(roomB)) {
                    possibleConnectionFound = false;
                    break;
                }

                for (let tileIndexA = 0; tileIndexA < roomA.edgeTiles.length; tileIndexA++) {
                    for (let tileIndexB = 0; tileIndexB < roomB.edgeTiles.length; tileIndexB++) {
                        const tileA = roomA.edgeTiles[tileIndexA];
                        const tileB = roomB.edgeTiles[tileIndexB];

                        const distanceBetweenRooms = Math.pow(tileA.x - tileB.x, 2) + Math.pow(tileA.y - tileB.y, 2);
                        if (distanceBetweenRooms < bestDistance || !possibleConnectionFound) {
                            bestDistance = distanceBetweenRooms;
                            possibleConnectionFound = true;

                            bestTileA = tileA;
                            bestTileB = tileB;

                            bestRoomA = roomA;
                            bestRoomB = roomB;
                        }
                    }
                }
            }

            if (possibleConnectionFound) {
                this.createPassage(bestRoomA, bestRoomB, bestTileA, bestTileB);
            }
        }
    }

    private createPassage(roomA: Room, roomB: Room, tileA: Coord, tileB: Coord): void {
        Room.connectRooms(roomA, roomB);

        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        const geometry = new THREE.Geometry();
        geometry.vertices.push(this.coordToWorldPoint(tileA), this.coordToWorldPoint(tileB));
        const line = new THREE.Line(geometry, material);

        this.scene.add(line);
    }

    private coordToWorldPoint(tile: Coord): THREE.Vector3 {
        return new THREE.Vector3(
            tile.x * this.cubeWidth,
            CellularAutomata.defaultYPos + 2,
            tile.y * this.cubeWidth
        );
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
