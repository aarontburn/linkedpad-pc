export type RGB = [number, number, number]

export class ColorHandler {

    public static readonly OFF: RGB = [0, 0, 0];

    public static readonly WHITE: RGB = [255, 255, 255];
    public static readonly RED: RGB = [255, 0, 0];
    public static readonly YELLOW: RGB = [255, 255, 0];
    public static readonly GREEN: RGB = [0, 255, 0];
    public static readonly BLUE: RGB = [0, 0, 255];
    public static readonly VIOLET: RGB = [125, 0, 255];

    public static readonly COLOR_SEQ: RGB[] = [
        ColorHandler.WHITE,
        ColorHandler.RED,
        ColorHandler.YELLOW,
        ColorHandler.GREEN,
        ColorHandler.BLUE,
        ColorHandler.VIOLET
    ]


    private static currentColorIndex: number = 0;

    public static getCurrentColor(): RGB {
        return this.COLOR_SEQ[ColorHandler.currentColorIndex]
    }

    public static nextColor(): void {
        ColorHandler.currentColorIndex++;
        if (ColorHandler.currentColorIndex > ColorHandler.COLOR_SEQ.length - 1) {
            ColorHandler.currentColorIndex = 0;
        }
    }

    public static isEqual(color1: RGB, color2: RGB): boolean {
        return JSON.stringify([...color1].sort()) === JSON.stringify([...color2].sort());
    }

    public static rgbToHex(color: RGB): string {
        const componentToHex: (c: number) => string = (c: number) => {
            const hex: string = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
    }



}