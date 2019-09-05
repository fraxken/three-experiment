import * as THREE from "three";
import Room from "./room";
import CellularArray from "./cellular-array";

export interface CellularOptions {
    chanceToStartAlive?: number;
    borderWidth?: number;
    cubeWidth?: number;
    voidRegionThreshold?: number;
    groundRegionThreshold?: number;
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
    private map: CellularArray;
    private voidRegionThreshold: number;
    private groundRegionThreshold: number;

    constructor(width: number, height: number = width, options: CellularOptions) {
        this.width = width;
        this.height = height;
        this.cubeWidth = options.cubeWidth || 1;
        this.borderWidth = options.borderWidth || 2;
        this.maxWidth = this.width - this.borderWidth;
        this.maxHeight = this.height - this.borderWidth;
        this.voidRegionThreshold = options.voidRegionThreshold || 50;
        this.groundRegionThreshold = options.groundRegionThreshold || 50;
        this.map = new CellularArray(width, height, true);

        const chanceToStartAlive = options.chanceToStartAlive || 0.58;
        for (const { x, y } of this.map) {
            if (this.isInMapBorderRange(x, y)) {
                this.map.set(x, y, kWaterOrVoid);
            }
            else {
                this.map.set(x, y, Math.random() > chanceToStartAlive ? kWaterOrVoid : kGround);
            }
        }
    }

    public *getRandomVectorInMap(luck: number = 0.5): IterableIterator<THREE.Vector3> {
        for (const { x, y, value } of this.map) {
            if (value >= kGround && Math.random() < luck) {
                yield this.coordToWorldPoint({ x, y });
            }
        }
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
            const newMap = new CellularArray(this.width, this.height);

            for (const { x, y } of newMap) {
                const groundNeighboursCount = this.getSurroundingNeighboursCount(x, y);
                newMap.set(x, y, groundNeighboursCount > 4 ? kWaterOrVoid : kGround);
            }

            this.map = newMap;
        }
        this.processMap();

        for (const { x, y, value } of this.map) {
            let mesh: THREE.Mesh;
            if (value === kWaterOrVoid) {
                mesh = this.createCube("#1976D2", 0.75);
                const yPos = CellularAutomata.defaultYPos - (this.cubeWidth / 2);
                mesh.position.set(x * this.cubeWidth, yPos, y * this.cubeWidth);
            }
            else {
                const color = value <= 7 ? CellularAutomata.borderColor : CellularAutomata.mainColor;
                mesh = this.createCube(color);
                mesh.position.set(x * this.cubeWidth, CellularAutomata.defaultYPos, y * this.cubeWidth);
            }
            yield mesh;
        }
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
                else if(!this.map.inRange(nbX, nbZ)){
                    count++;
                }
                else if(this.map.get(nbX, nbZ) > 0){
                    count++;
                }
            }
        }

        return count;
    }

    private processMap(): void {
        const survivingRooms: Room[] = [];

        for (const region of this.getRegions(kGround)) {
            if (region.length < this.groundRegionThreshold) {
                this.map.flagMapFromCoords(region, kWaterOrVoid);
            }
            else {
                survivingRooms.push(new Room(region, this.map));
            }
        }

        // Cleanup water
        for (const region of this.getRegions(kWaterOrVoid)) {
            if (region.length < this.voidRegionThreshold) {
                this.map.flagMapFromCoords(region, kGround);
            }
        }

        survivingRooms.sort((a, b) => b.roomSize - a.roomSize);
        survivingRooms[0].isMainRoom = true;
        survivingRooms[0].isAccessibleFromMainRoom = true;

        this.connectClosestRooms(survivingRooms);
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

    private drawCircle(tile: Coord, radius: number) {
        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                if (x*x + y*y <= radius*radius) {
                    const drawX = tile.x + x;
                    const drawY = tile.y + y;
                    if (this.map.inRange(drawX, drawY)) {
                        this.map.set(drawX, drawY, kGround);
                    }
                }
            }
        }
    }

    private createPassage(roomA: Room, roomB: Room, tileA: Coord, tileB: Coord): void {
        Room.connectRooms(roomA, roomB);
        for (const tile of this.getLine(tileA, tileB)) {
            this.drawCircle(tile, 3);
        }
    }

    getLine(from: Coord, to: Coord): Coord[] {
        const line: Coord[] = [];
        let { x, y } = from;
        const [dx, dy] = [to.x - x, to.y - y];
        let [longest, shortest] = [Math.abs(dx), Math.abs(dy)];

        const step = Math.sign(longest < shortest ? dy : dx);
        const gradientStep = Math.sign(longest < shortest ? dx : dy);
        const inverted = longest < shortest;
        if (longest < shortest) {
            longest = Math.abs(dy);
            shortest = Math.abs(dx);
        }

        let gradientAccumulation = longest / 2;
        for (let i = 0; i < longest; i++) {
            line.push({ x, y });

            if (inverted) {
                y += step;
            }
            else {
                x += step;
            }

            gradientAccumulation += shortest;
            if (gradientAccumulation >= longest) {
                if (inverted) {
                    x += gradientStep;
                }
                else {
                    y += gradientStep;
                }

                gradientAccumulation -= longest;
            }
        }

        return line;
    }

    private coordToWorldPoint(tile: Coord, y: number = 0): THREE.Vector3 {
        return new THREE.Vector3(
            tile.x * this.cubeWidth,
            CellularAutomata.defaultYPos + y,
            tile.y * this.cubeWidth
        );
    }

    private *getRegions(type: number): IterableIterator<Coord[]> {
        const mapFlags = new CellularArray(this.width, this.height, true);

        for (const { x, y, value } of this.map) {
            if (mapFlags.get(x, y) === 0 && value === type) {
                const newRegion = this.getRegionTiles(x, y, type);
                mapFlags.flagMapFromCoords(newRegion, 1);
                yield newRegion;
            }
        }
    }

    private getRegionTiles(startX: number, startY: number, type: number): Coord[] {
        const tiles: Coord[] = [];
        const mapFlags = new CellularArray(this.width, this.height, true);

        const queue: Coord[] = [{ x: startX, y: startY }];
        mapFlags.set(startX, startY, 1);

        while (queue.length > 0) {
            const tile = queue.shift();
            tiles.push(tile);

            for (const { x, y, value } of this.map.forTile(tile.x, tile.y)) {
                if ((x === tile.x || y === tile.y) && mapFlags.get(x, y) === 0 && value === type) {
                    mapFlags.set(x, y, 1);
                    queue.push({ x, y });
                }
            }
        }

        return tiles;
    }
}
