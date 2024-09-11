export type RGB = [number, number, number]

export class ColorHandler {




    public static readonly OFF: RGB = [0, 0, 0];

    public static readonly WHITE: RGB = [255, 255, 255];
    public static readonly RED: RGB = [255, 0, 0];
    public static readonly YELLOW: RGB = [255, 255, 0];
    public static readonly GREEN: RGB = [0, 255, 0];
    public static readonly BLUE: RGB = [0, 0, 255];
    public static readonly VIOLET: RGB = [125, 0, 255];
    public static readonly PEACH: RGB = [255, 196, 213];


    public static DEFAULT_COLORS: RGB[] = [
        ColorHandler.WHITE,
        ColorHandler.RED,
        ColorHandler.YELLOW,
        ColorHandler.GREEN,
        ColorHandler.BLUE,
        ColorHandler.VIOLET,
        ColorHandler.PEACH,
    ]

    private static COLOR_SEQ: RGB[] = this.DEFAULT_COLORS;

    private static currentColorIndex: number = 0;
    private static currentColor: RGB = this.COLOR_SEQ[this.currentColorIndex];


    public static setColorList(hexArray: string[]): void {
        if (hexArray === undefined) {
            this.COLOR_SEQ = this.DEFAULT_COLORS;
            return;
        }

        this.COLOR_SEQ = hexArray.map(this.hexToRGB);


    }


    public static getCurrentColor(): RGB {
        return this.currentColor;
    }


    public static getNextColor(): RGB {
        const i: number = this.currentColorIndex;
        return this.COLOR_SEQ[((i + 1) > this.COLOR_SEQ.length - 1) ? 0 : i + 1]
    }



    public static setColor(rgb: RGB | string): void {
        if (typeof rgb === 'string') {
            rgb = this.hexToRGB(rgb);
        }


        const index: number = this.getColorIndex(rgb);
        if (index > -1) {
            this.currentColorIndex = index;
            this.currentColor = this.COLOR_SEQ[this.currentColorIndex];
            return;
        }

        console.error("ERROR: Invalid rgb passed (rgb not within available colors): " + rgb);
        this.setColor(this.COLOR_SEQ[0]);
    }

    public static getColorIndex(rgb: RGB): number {
        for (let i = 0; i < this.COLOR_SEQ.length; i++) {
            if (this.isEqual(rgb, this.COLOR_SEQ[i])) {
                return i;
            }
        }

        return -1;
    }



    public static getAvailableColors(): RGB[] {
        return [...this.COLOR_SEQ];
    }

    public static isEqual(color1: RGB, color2: RGB): boolean {
        return JSON.stringify([...color1]) === JSON.stringify([...color2]);
    }

    public static rgbToHex(color: RGB): string {
        const componentToHex: (c: number) => string = (c: number) => {
            const hex: string = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
    }

    public static hexToRGB(hex: string): RGB {
        if (hex[0] === '#') {
            hex = hex.substring(1);
        }
        const bigint: number = parseInt(hex, 16);
        const r: number = (bigint >> 16) & 255;
        const g: number = (bigint >> 8) & 255;
        const b: number = bigint & 255;

        return [r, g, b];
    }

    public static isValidHex(hex: string): boolean {
        return /^#[0-9A-F]{6}$/i.test(hex.toUpperCase());
    }




}