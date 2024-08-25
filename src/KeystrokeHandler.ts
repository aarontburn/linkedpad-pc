// @ts-ignore
import * as robot from '@jitsi/robotjs';
import { StorageHandler } from './StorageHandler';

robot.setKeyboardDelay(1);

export class KeystrokeHandler {
    private static readonly PATH: string = 'keys.json';

    private static KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    private static readonly HEADERS: string[] = ["H0", "H1", "H2", "H3"];

    private static readonly keyMap: Map<string, string | string[]> = new Map();

    // Stores name of key to combination
    private static readonly keyGroupMap: Map<string, string> = new Map();

    public static init(): void {
        for (const keyGroup of this.getKeyGroups()) {
            for (const internalKeyName in keyGroup) {
                if (internalKeyName === 'name') {
                    continue;
                }
                if (this.keyGroupMap.has(internalKeyName)) {
                    console.log("Duplicate key found: " + internalKeyName);
                }

                // Either key code or [code, displayName]
                const k: string | string[] = keyGroup[internalKeyName];

                if (typeof k === 'string') { // Just key code
                    this.keyGroupMap.set(internalKeyName, k);
                } else {
                    const code: string = k[0];
                    const displayName: string = k[1];
                    this.keyGroupMap.set(displayName, code);
                }
            }
        }


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

    public static async pressMacroKey(rowCol: string, state: KeyState) {
        const macro: string | string[] = this.keyMap.get(rowCol);
        if (!macro || macro.length == 0) {
            return;
        }

        if (typeof macro === "string") {
            if (state !== 'up') {
                robot.typeString(macro);
            }
            return;
        }
        const keyList: string[] = this.formatKeySequence(macro);

        if (keyList.length !== 0) {
            for (const key of keyList) {
                robot.keyToggle(key, state === 'hold' ? 'down' : state);
            }
        }
    }


    public static getKeyGroups(): KeyGroup[] {
        return [ALPHA, NUMERIC, AUDIO, FUNCTIONS, MODIFIERS, CONTROLS, NUMPAD, SYMBOLS];
    }



    private static formatKeySequence(sequence: string[]): string[] {
        const out: string[] = sequence.filter(c => c !== null);

        return out.map(c => this.keyGroupMap.get(c));
    }

}

export type KeyState = 'hold' | 'down' | 'up';

interface KeyGroup {
    name: string,
    [key: string]: string | string[]
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
    ZERO: ['0', '0'],
    ONE: ['1', '1'],
    TWO: ['2', '2'],
    THREE: ['3', '3'],
    FOUR: ['4', '4'],
    FIVE: ['5', '5'],
    SIX: ['6', '6'],
    SEVEN: ['7', '7'],
    EIGHT: ['8', '8'],
    NINE: ['9', '9'],
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

export const AUDIO: KeyGroup = {
    name: 'AUDIO',
    MUTE: ['audio_mute', 'Mute'],
    VOL_DOWN: ['audio_vol_down', "Vol -"],
    VOL_UP: ['audio_vol_up', 'Vol +'],
    PLAY_PAUSE: ['audio_play', 'Play Pause'],
    STOP: ['audio_stop', 'Stop'],
    REWIND: ['audio_prev', 'Rewind'],
    SKIP: ['audio_next', 'Skip'],
}


export const MODIFIERS: KeyGroup = {
    name: "MODIFIERS",

    COMMAND: ['command', '田 Win'],

    ALT: ['alt', 'Alt'],
    RIGHT_ALT: ['right_alt', 'Right Alt'],

    CONTROL: ['control', 'Ctrl'],
    LEFT_CONTROL: ['left_control', 'Left Ctrl'],
    RIGHT_CONTROL: ['right_control', 'Right Ctrl'],

    SHIFT: ['shift', 'Shift'],
    RIGHT_SHIFT: ['right_shift', 'Right Shift'],
}


export const CONTROLS: KeyGroup = {
    name: "CONTROLS",

    BACKSPACE: ['backspace', 'Back Space'],
    DELETE: ['delete', 'Delete'],
    ENTER: ['enter', 'Enter'],
    TAB: ['tab', 'Tab'],
    ESCAPE: ['escape', 'Escape'],

    UP: ['up', 'Arrow Up'],
    DOWN: ['down', 'Arrow Down'],
    RIGHT: ['right', 'Arrow Right'],
    LEFT: ['left', 'Arrow Left'],

    HOME: ['home', 'Home'],
    END: ['end', 'End'],
    PAGE_UP: ['pageup', 'Page Up'],
    PAGE_DOWN: ['pagedown', 'Page Down'],

    CAPS_LOCK: ['capslock', 'Caps Lock'],
    SPACE: ['space', 'Space'],
    INSERT: ['insert', 'Insert'],

}

export const NUMPAD: KeyGroup = {
    name: "NUMPAD",

    NUM_LOCK: ["numpad_lock", 'Num Lock'],
    NUMPAD_0: ['numpad_0', 'Num 0'],
    NUMPAD_1: ['numpad_1', 'Num 1'],
    NUMPAD_2: ['numpad_2', 'Num 2'],
    NUMPAD_3: ['numpad_3', 'Num 3'],
    NUMPAD_4: ['numpad_4', 'Num 4'],
    NUMPAD_5: ['numpad_5', 'Num 5'],
    NUMPAD_6: ['numpad_6', 'Num 6'],
    NUMPAD_7: ['numpad_7', 'Num 7'],
    NUMPAD_8: ['numpad_8', 'Num 8'],
    NUMPAD_9: ['numpad_9', 'Num 9'],

    NUMPAD_PLUS: ['numpad_+', 'Num +'],
    NUMPAD_MINUS: ['numpad_-', 'Num -'],
    NUMPAD_MULTIPLY: ['numpad_*', 'Num *'],
    NUMPAD_DIVIDE: ['numpad_/', 'Num /'],
    NUMPAD_DECIMAL: ['numpad_.', 'Num .'],
}

export const SYMBOLS: KeyGroup = {
    name: "SYMBOLS",

    COMMA: [',', ','],
    PERIOD: ['.', '.'],
    SLASH: ['/', '/'],
    BACK_SLASH: ['\\', '⧵'],
    SEMICOLON: [';', ';'],
    EQUALS: ['=', '='],
    OPEN_BRACKET: ['[', '['],
    MULTIPLY: ['*', '*'],
    ADD: ['+', '+'],
    SUBTRACT: ['-', '-'],
    DECIMAL: ['.', '.'],
    SINGLE_QUOTE: ['\'', '\''],
    DOUBLE_QUOTE: ['"', '"'],
    AMPERSAND: ['&', '&'],
    ASTERISK: ['*', '*'],
    LESS: ['<', '<'],
    GREATER: ['>', '>'],
    OPEN_BRACE: ['{', '{'],
    CLOSED_BRACE: ['}', '}'],
    AT: ['@', '@'],
    COLON: ['.', '.'],
    CIRCUMFLEX: ['^', '^'],
    DOLLAR: ['$', '$'],
    EXCLAMATION: ['!', '!'],
    OPEN_PARENTHESIS: ['(', '('],
    CLOSED_PARENTHESIS: [')', ')'],
    HASHTAG: ['#', '#'],
    UNDERSCORE: ['_', '_'],

};














