import { Coord } from "./cellular-automata";

export default class Room {
    public tiles: Set<Coord>;
    public roomSize: number;
    public edgeTiles: Coord[] = [];
    public connectedRooms: Set<Room> = new Set<Room>();
    public isAccessibleFromMainRoom: boolean;
    public isMainRoom: boolean;

    constructor(roomTiles: Set<Coord>, map: number[][]) {
        this.tiles = roomTiles;
        this.roomSize = this.tiles.size;

        for (const tile of this.tiles) {
            for (let x = tile.x - 1; x <= tile.x + 1; x++) {
                for (let y = tile.y - 1; y <= tile.y + 1; y++) {
                    if ((x === tile.x || y === tile.y) && map[x][y] === 1) {
                        this.edgeTiles.push(tile);
                    }
                }
            }
        }
    }

    public setAccessibleFromMainRoom(): void {
        if (!this.isAccessibleFromMainRoom) {
            this.isAccessibleFromMainRoom = true;
            for (const connectRooms of this.connectedRooms) {
                connectRooms.setAccessibleFromMainRoom();
            }
        }
    }

    static connectRooms(roomA: Room, roomB: Room): void {
        if (roomA.isAccessibleFromMainRoom) {
            roomB.setAccessibleFromMainRoom();
        }
        else if (roomB.isAccessibleFromMainRoom) {
            roomA.setAccessibleFromMainRoom();
        }
        roomA.connectedRooms.add(roomB);
        roomB.connectedRooms.add(roomA);
    }

    public isConnected(room: Room): boolean {
        return this.connectedRooms.has(room);
    }
}
