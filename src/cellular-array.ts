import { Coord } from "./cellular-automata";

export type CellularCase = 1 | 0;
export interface CellularRow {
    x: number;
    y: number;
    value: CellularCase;
}

export default class CellularArray {
    static defaultValue: CellularCase = 0;

    public width: number;
    public height: number;
    private array: CellularCase[][] = [];

    constructor(width: number, height: number = width, init: boolean = false) {
        this.width = width;
        this.height = height;

        if (init) {
            for (let x = 0; x < width; x++) {
                this.array[x] = [];
                for (let y = 0; y < height; y++) {
                    this.array[x][y] = CellularArray.defaultValue;
                }
            }
        }
    }

    *[Symbol.iterator](): IterableIterator<CellularRow> {
        for (let x = 0; x < this.width; x++) {
            if (!Reflect.has(this.array, x)) {
                this.array[x] = [];
            }

            for (let y = 0; y < this.height; y++) {
                yield { x, y, value: this.array[x][y] };
            }
        }
    }

    *forTile(tileX: number, tileY: number): IterableIterator<CellularRow> {
        for (let x = tileX - 1; x <= tileX + 1; x++) {
            for (let y = tileY - 1; y <= tileY + 1; y++) {
                if (this.inRange(x, y)) {
                    yield { x, y, value: this.array[x][y] };
                }
            }
        }
    }

    flagMapFromCoords(coords: Set<Coord> | Coord[], type: CellularCase) {
        for (const tile of coords) {
            this.array[tile.x][tile.y] = type;
        }
    }

    inRange(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    get(x: number, y: number): CellularCase | null {
        return this.inRange(x, y) ? this.array[x][y] : null;
    }

    set(x: number, y: number, value: CellularCase): void {
        if (this.inRange(x, y)) {
            this.array[x][y] = value;
        }
    }
}
