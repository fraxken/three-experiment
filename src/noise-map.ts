import * as THREE from "three";
import * as SimplexNoise from "simplex-noise";

export interface NoiseOptions {
    scale?: number;
    octaves?: number;
    persistance?: number;
    lacunarity?: number;
}

function clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
}

function inverseLerp(a, b, value) {
    return (clamp(value, Math.min(a, b), Math.max(a, b)) - a) / (b - a);
}

export class Noise {
    static DEFAULT_SCALE: number = 0.0001;

    static generateNoiseMap(mapWidth: number, mapHeight: number, options: NoiseOptions): number[][] {
        let { scale = Noise.DEFAULT_SCALE } = options;
        const { octaves = 5, persistance = 1, lacunarity = 1 } = options;

        const simplex = new SimplexNoise();
        const noiseMap: number[][] = [];
        if (scale <= 0) {
            scale = Noise.DEFAULT_SCALE;
        }

        const octaveOffsets: THREE.Vector2[] = [];
        for (let i = 0; i < octaves; i++) {
            const offsetX = THREE.Math.randInt(-100000, 100000);
            const offsetY = THREE.Math.randInt(-100000, 100000);

            octaveOffsets[i] = new THREE.Vector2(offsetX, offsetY);
        }

        let maxNoiseHeight = Number.MIN_SAFE_INTEGER;
        let minNoiseHeight = Number.MAX_SAFE_INTEGER;
        let halfWidth = mapWidth / 2;
        let halfHeight = mapHeight / 2;

        for (let y = 0; y < mapHeight; y++) {
            noiseMap[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                let amplitude = 1;
                let frequency = 1;
                let noiseHeight = 0;

                for (let i = 0; i < octaves; i++) {
                    const sampleX = (octaveOffsets[i].x + x - halfWidth) / scale * frequency;
                    const sampleY = (octaveOffsets[i].y + y - halfHeight) / scale * frequency;

                    const perlinValue = simplex.noise2D(sampleX, sampleY);
                    noiseHeight += perlinValue * amplitude;
                    amplitude *= persistance;
                    frequency *= lacunarity;
                }

                if (noiseHeight > maxNoiseHeight) {
                    maxNoiseHeight = noiseHeight;
                }
                else if (noiseHeight < minNoiseHeight) {
                    minNoiseHeight = noiseHeight;
                }
                noiseMap[y][x] = noiseHeight;
            }
        }

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                noiseMap[y][x] = inverseLerp(minNoiseHeight, maxNoiseHeight, noiseMap[y][x]);
            }
        }

        return noiseMap;
    }
}

export class Color {
    static White: number = 0xffffff;
    static Black: number = 0x000000;

    static linearInterpolation(colorA: number, colorB: number, amount: number): number {
        const ar = colorA >> 16,
            ag = colorA >> 8 & 0xff,
            ab = colorA & 0xff,

            br = colorB >> 16,
            bg = colorB >> 8 & 0xff,
            bb = colorB & 0xff,

            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);

        return (rr << 16) + (rg << 8) + (rb | 0);
    }
}

export interface TerrainType {
    name: string;
    height: number;
    color: string | number | THREE.Color;
}

export class NoiseMap {
    public width: number;
    public height: number;
    public regions: TerrainType[] = [];

    constructor(width: number, height: number = width) {
        this.width = width;
        this.height = height;
    }

    public *initMap(options: NoiseOptions): IterableIterator<THREE.Mesh> {
        const noiseMap = Noise.generateNoiseMap(this.width, this.height, options);

        for (let x = 0; x < this.height; x++) {
            for (let y = 0; y < this.width; y++) {
                const currentHeight = noiseMap[x][y];
                // const color = Color.linearInterpolation(Color.Black, Color.White, currentHeight);

                let color: string | number | THREE.Color;
                for (let i = 0; i < this.regions.length; i++) {
                    if (currentHeight <= this.regions[i].height) {
                        color = this.regions[i].color;
                        break;
                    }
                }

                const mesh = new THREE.Mesh(
                    new THREE.BoxBufferGeometry(1, 1, 1),
                    new THREE.MeshBasicMaterial({ color })
                );
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                mesh.position.set(x, 0, y);

                yield mesh;
            }
        }
    }
}
