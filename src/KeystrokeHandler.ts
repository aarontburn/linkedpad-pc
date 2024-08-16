// @ts-ignore
import * as ks from 'node-key-sender';
import { StorageHandler } from './StorageHandler';
// https://github.com/garimpeiro-it/node-key-sender

export class KeystrokeHandler {
    private static readonly PATH: string = 'keys.json';

    private static KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    private static readonly HEADERS: string[] = ["H0", "H1", "H2", "H3"];

    private static readonly keyMap: Map<string, string | string[]> = new Map();


    public static init(): void {
        const data: any = JSON.parse(StorageHandler.readFromModuleStorage(this.PATH));
        if (data !== null) {
            for (const rowCol of [...this.KEYS, ...this.HEADERS]) {
                this.keyMap.set(rowCol, data[rowCol] ?? [null, null, null, null]);
            }
        } else {
            // Error parsing
            for (const rowCol of [...this.KEYS, ...this.HEADERS]) {
                this.keyMap.set(rowCol, [null, null, null, null]);
            }
        }
        this.writeMapToStorage();
    }

    public static setKey(rowCol: string, value: string | string[]): void {
        this.keyMap.set(rowCol, value);
        this.writeMapToStorage();
    }

    private static keyMapToObj(): any {
        const obj: { [rowCol: string]: (string | string[]) } = {}
        this.keyMap.forEach((value, key) => {
            obj[key] = value ?? [null, null, null, null];
        });
        return obj;
    }

    private static writeMapToStorage(): void {
        StorageHandler.writeToStorage(
            this.PATH,
            JSON.stringify(this.keyMapToObj(), undefined, 4))
    }


    public static getKeyMap(): { [rowCol: string]: (string | string[]) } {
        return this.keyMapToObj();
    }


    public static async sendKey(key: string[] | string) {
        if (typeof key === "string") {
            await ks.sendKey(key);
            return;
        }


        await ks.sendCombination(key);
    }


    public static getKeyGroups(): { [key: string]: string }[] {
        return [ALPHA, NUMERIC, FUNCTIONS, MODIFIERS, CONTROLS, NUMPAD, SYMBOLS];
    }


    public static async sendLetter(letter: string) {
        await ks.sendLetter(letter);
        console.log(`Sent: ${letter}`)
    }

}



interface KeyGroup {
    name: string,
    [key: string]: string
}



export const ALPHA: KeyGroup = {
    name: "ALPHA",
    a: 'a',
    b: 'b',
    c: 'c',
    d: 'd',
    e: 'e',
    f: 'f',
    g: 'g',
    h: 'h',
    i: 'i',
    j: 'j',
    k: 'k',
    l: 'l',
    m: 'm',
    n: 'n',
    o: 'o',
    p: 'p',
    q: 'q',
    r: 'r',
    s: 's',
    t: 't',
    u: 'u',
    v: 'v',
    w: 'w',
    x: 'x',
    y: 'y',
    z: 'z',
}


export const NUMERIC: KeyGroup = {
    name: "NUMERIC",
    ZERO: '0',
    ONE: '1',
    TWO: '2',
    THREE: '3',
    FOUR: '4',
    FIVE: '5',
    SIX: '6',
    SEVEN: '7',
    EIGHT: '8',
    NINE: '9',
}


export const FUNCTIONS: KeyGroup = {
    name: "FUNCTIONS",
    F1: 'f1',
    F2: 'f2',
    F3: 'f3',
    F4: 'f4',
    F5: 'f5',
    F6: 'f6',
    F7: 'f7',
    F8: 'f8',
    F9: 'f9',
    F10: 'f10',
    F11: 'f11',
    F12: 'f12',
    F13: 'f13',
    F14: 'f14',
    F15: 'f15',
    F16: 'f16',
    F17: 'f17',
    F18: 'f18',
    F19: 'f19',
    F20: 'f20',
    F21: 'f21',
    F22: 'f22',
    F23: 'f23',
    F24: 'f24',
}


export const MODIFIERS: KeyGroup = {
    name: "MODIFIERS",
    COMMAND: 'command',
    ALT: 'alt',
    CONTROL: 'control',
    SHIFT: 'shift',
    RIGHT_SHIFT: 'right_shift',
}


export const CONTROLS: KeyGroup = {
    name: "CONTROLS",
    ENTER: 'enter',
    BACKSPACE: 'back_space',
    TAB: 'tab',
    PAUSE: 'pause',
    CAPS_LOCK: 'caps_lock',
    ESCAPE: 'escape',
    SPACE: 'space',
    PAGE_UP: 'page_up',
    PAGE_DOWN: 'page_down',
    END: 'end',
    HOME: 'home',

    UP: 'up',
    DOWN: 'down',
    RIGHT: 'right',
    LEFT: 'left',

    NUM_LOCK: "num_lock",
    PRINT_SCREEN: 'print_screen',
    INSERT: 'insert',
    DELETE: 'delete',

    WINDOWS: 'windows'
}

export const NUMPAD: KeyGroup = {
    name: "NUMPAD",

    NUMPAD_0: 'numpad0',
    NUMPAD_1: 'numpad1',
    NUMPAD_2: 'numpad2',
    NUMPAD_3: 'numpad3',
    NUMPAD_4: 'numpad4',
    NUMPAD_5: 'numpad5',
    NUMPAD_6: 'numpad6',
    NUMPAD_7: 'numpad7',
    NUMPAD_8: 'numpad8',
    NUMPAD_9: 'numpad9',
    NUMPAD_UP: 'kp_up',
    NUMPAD_DOWN: 'kp_down',
    NUMPAD_LEFT: 'kp_left',
    NUMPAD_RIGHT: 'kp_right',
}

export const SYMBOLS: KeyGroup = {
    name: "SYMBOLS",

    COMMA: 'comma',
    PERIOD: 'period',
    SLASH: 'slash',
    BACK_SLASH: 'back_slash',
    SEMICOLON: 'semicolon',
    EQUALS: 'equals',
    OPEN_BRACKET: 'open_bracket',
    MULTIPLY: 'multiply',
    ADD: 'add',
    SUBTRACT: 'subtract',
    DECIMAL: 'decimal',
    DIVIDE: 'divide',
    SINGLE_QUOTE: 'quote',
    DOUBLE_QUOTE: 'quotedbl', // Test this
    AMPERSAND: 'ampersand',
    ASTERISK: 'asterisk',
    LESS: 'less',
    GREATER: 'greater',
    OPEN_BRACE: 'braceleft',
    CLOSED_BRACE: 'braceright',
    AT: 'at',
    COLON: 'colon',
    CIRCUMFLEX: 'circumflex', // the '^' symbol
    DOLLAR: 'dollar',
    EXCLAMATION: 'exclamation_mark',
    OPEN_PARENTHESIS: 'left_parenthesis',
    CLOSED_PARENTHESIS: 'right_parenthesis',
    HASHTAG: 'number_sign', // maybe?
    UNDERSCORE: 'underscore',

};














