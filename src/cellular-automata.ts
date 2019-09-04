import * as THREE from "three";
import Room from "./room";

export interface CellularOptions {
    chanceToStartAlive?: number;
    borderWidth?: number;
    cubeWidth?: number;
    voidRegionThreshold?: number;
    groundRegionThreshold?: number;
    scene: THREE.Scene;
}

export interface Coord {
    x: number;
    y: number;
}

export type Color = string | number | THREE.Color;

// CONSTANTS
const kWaterOrVoid = 0;
const kGround = 1;

export default class CellularAutomata {
    static defaultYPos: number = 0;
    static mainColor: Color = "#4CAF50";
    static borderColor: Color = "#66BB6A";
    static waterColor: Color = "#1976D2";

    private width: number;
    private maxWidth: number;
    private height: number;
    private maxHeight: number;
    private cubeWidth: number;
    private borderWidth: number;
    private map: number[][] = [];
    private scene: THREE.Scene;
    private voidRegionThreshold: number;
    private groundRegionThreshold: number;

    constructor(width: number, height: number = width, options: CellularOptions) {
        this.width = width;
        this.height = height;
        this.cubeWidth = options.cubeWidth || 50;
        this.scene = options.scene;
        this.borderWidth = options.borderWidth || 2;
        this.maxWidth = this.width - this.borderWidth;
        this.maxHeight = this.height - this.borderWidth;
        this.voidRegionThreshold = options.voidRegionThreshold || 50;
        this.groundRegionThreshold = options.groundRegionThreshold || 50;

        const chanceToStartAlive = options.chanceToStartAlive || 0.58;
        for (let x = 0; x < this.width; x++) {
            this.map[x] = [];
            for (let y = 0; y < this.height; y++) {
                if (this.isInMapBorderRange(x, y)) {
                    this.map[x][y] = kWaterOrVoid;
                }
                else {
                    this.map[x][y] = Math.random() > chanceToStartAlive ? kWaterOrVoid : kGround;
                }
            }
        }
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

    private isInMapRange(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    private isInMapBorderRange(x: number, y: number): boolean {
        return x <= this.borderWidth || x >= this.maxWidth || y <= this.borderWidth || y >= this.maxHeight;
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

        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                let mesh: THREE.Mesh;
                if (this.map[x][z] === kWaterOrVoid) {
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
                const groundNeighboursCount = this.getSurroundingNeighboursCount(x, z);

                if (groundNeighboursCount > 4) {
                    newMap[x][z] = kWaterOrVoid;
                }
                else {
                    newMap[x][z] = kGround;
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

    private flagMapFromCoords(coords: Set<Coord>, type: number) {
        for (const tile of coords) {
            this.map[tile.x][tile.y] = type;
        }
    }

    private processMap(): void {
        const survivingRooms: Room[] = [];
        for (const region of this.getRegions(kGround)) {
            if (region.size < this.groundRegionThreshold) {
                this.flagMapFromCoords(region, kWaterOrVoid);
            }
            else {
                survivingRooms.push(new Room(region, this.map));
            }
        }

        // Cleanup water
        for (const region of this.getRegions(kWaterOrVoid)) {
            if (region.size < this.voidRegionThreshold) {
                this.flagMapFromCoords(region, kGround);
            }
        }

        survivingRooms.sort((a, b) => b.roomSize - a.roomSize);
        survivingRooms[0].isMainRoom = true;
        survivingRooms[0].isAccessibleFromMainRoom = true;

        this.connectClosestRooms(survivingRooms);

        // Apply our cost algorithm
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.height; z++) {
                if (this.map[x][z] === 0) {
                    continue;
                }

                this.map[x][z] = this.getSurroundingNeighboursCount(x, z);
            }
        }
    }

    private connectClosestRooms(allRooms: Room[], forceAccessFromMainRoom: boolean = false): void {
        let roomListA: Room[] = forceAccessFromMainRoom ? [] : allRooms;
        let roomListB: Room[] = forceAccessFromMainRoom ? [] : allRooms;
        if (forceAccessFromMainRoom) {
            for (const room of allRooms) {
                (room.isAccessibleFromMainRoom ? roomListB : roomListA).push(room);
            }
        }

        let bestDistance = 0;
        let possibleConnectionFound = false;
        let bestTileA: Coord;
        let bestTileB: Coord;
        let bestRoomA: Room;
        let bestRoomB: Room;

        for (const roomA of roomListA) {
            if (!forceAccessFromMainRoom) {
                possibleConnectionFound = false;
                if (roomA.connectedRooms.size > 0) {
                    continue;
                }
            }

            for (const roomB of roomListB) {
                if (roomA === roomB || roomA.isConnected(roomB)) {
                    continue;
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

            if (possibleConnectionFound && !forceAccessFromMainRoom) {
                this.createPassage(bestRoomA, bestRoomB, bestTileA, bestTileB);
            }
        }

        if (possibleConnectionFound && forceAccessFromMainRoom) {
            this.createPassage(bestRoomA, bestRoomB, bestTileA, bestTileB);
            this.connectClosestRooms(allRooms, true);
        }

        if (!forceAccessFromMainRoom) {
            this.connectClosestRooms(allRooms, true);
        }
    }

    private createPassage(roomA: Room, roomB: Room, tileA: Coord, tileB: Coord): void {
        Room.connectRooms(roomA, roomB);

        const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        const geometry = new THREE.Geometry();
        geometry.vertices.push(this.coordToWorldPoint(tileA, 2), this.coordToWorldPoint(tileB, 2));
        const line = new THREE.Line(geometry, material);

        this.scene.add(line);
    }

    private coordToWorldPoint(tile: Coord, y: number = 0): THREE.Vector3 {
        return new THREE.Vector3(
            tile.x * this.cubeWidth,
            CellularAutomata.defaultYPos + y,
            tile.y * this.cubeWidth
        );
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
