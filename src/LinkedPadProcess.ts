import { KeyState, KeystrokeHandler } from "./KeystrokeHandler";
import { ColorHandler, RGB } from "./ColorHandler";
import { SerialHandler } from "./SerialHandler";
import { DatabaseHandler } from "./DatabaseHandler";
import { Settings } from "./Settings";




export class LinkedPadProcess {

    private readonly KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));


    private localState: { [rowCol: string]: RGB } = (() => {
        const obj: { [rowCol: string]: RGB } = {};
        for (const rowCol of this.KEYS) {
            obj[rowCol] = ColorHandler.OFF;
        }
        return obj;
    })();

    private inLinkedMode: boolean = false;


    // 0.01, 0.1, 0.2, ..., 0.9, 1
    private brightnessSteps: number[] = [0.01, ...Array.from({ length: 10 }, (_, i) => (i + 1) / 10)];
    private brightnessIndex: number = 0;


    private readonly sendToRenderer: (...args: any[]) => void;

    public constructor(sendToRenderer: (...args: any[]) => void) {
        this.sendToRenderer = sendToRenderer;
    }

    public initialize(): void {

        ColorHandler.setColorList((Settings.getSettingValue('color_list') as string).split(' ').filter(w => w));
        this.setBrightness(Settings.getSettingValue('brightness'))
        this.inLinkedMode = Settings.getSettingValue('in_linked_mode');


        SerialHandler.init(
            this.handleSerialEvents.bind(this),
            ((prevStatus: 0 | 1 | 2, status: 0 | 1 | 2) => {
                this.sendToRenderer('connection-status', status);

                if (prevStatus !== 2 && status === 2) { // Send data over
                    SerialHandler.write(`linked-mode ${this.inLinkedMode ? 1 : 0} [${ColorHandler.getCurrentColor()}]`);


                    SerialHandler.write(`linked-state ${this.stateToString()}`);

                    SerialHandler.write(`selected-color [${ColorHandler.getCurrentColor()}]`);
                    SerialHandler.write(`brightness ${Settings.getSettingValue('brightness')}`);
                    SerialHandler.write(`color-options ${ColorHandler.getAvailableColors().map(ColorHandler.rgbToHex)}`);
                }
            }).bind(this)
        );


        KeystrokeHandler.init();
        DatabaseHandler.initDatabase(
            this.recalibrate.bind(this), 
            this.setLight.bind(this),
            (() => {
                this.sendToRenderer("database-connected")
            }).bind(this)
        );

        this.sendToRenderer('update-keys', KeystrokeHandler.getKeyMap());
        this.sendToRenderer('key-options', KeystrokeHandler.getKeyGroups());
        this.sendToRenderer('color-options', ColorHandler.getAvailableColors());
        this.sendToRenderer('selected-color', ColorHandler.getCurrentColor());
        this.sendToRenderer('settings', Settings.getSettingMap());
        this.sendToRenderer('linked-mode', this.inLinkedMode);
    }

    public onExit(): void {
        SerialHandler.stop();
    }

    private handleSerialEvents(eventString: string): void {
        const split: string[] = eventString.split(" ");

        switch (split[0]) {
            case 'wifi': {
                const status: string = split[1];

                switch (status) {
                    case 'start': {
                        this.sendToRenderer('wifi-change', 0);
                        console.log("Attempting to connect to WiFi...");
                        break;
                    }
                    case 'end': {
                        console.log("WiFi connection finished. Attempting to connect to the internet...");
                        break;
                    }
                    case 'connected': {
                        this.sendToRenderer('wifi-change', 1);
                        console.log("WiFi connection successful");
                        break;
                    }
                    case 'disconnected': {
                        this.sendToRenderer('wifi-change', -1);
                        console.log("WiFi connection unsuccessful. Double check the password.");
                        break;
                    }
                }
                break
            }

            case 'status': {
                const statusObject: { [key: string]: any } = JSON.parse(split.slice(1).join(''));
                this.sendToRenderer('status', statusObject);
                console.log(statusObject);
                break;
            }


            default: {
                const parseToRowCol = (s: string): [string, string, KeyState] | undefined => {
                    const data: string[] = (s.toString() as string).trim().split(" ");

                    console.log("Serial (RAW): " + s);

                    if (data[0].length !== 2) {
                        return undefined
                    }

                    const rowCol: string = data[0];
                    const state: KeyState = data[1] as KeyState

                    return [rowCol[0], rowCol[1], state];
                }

                const rowColState: [string, string, KeyState] = parseToRowCol(eventString);

                if (rowColState) {
                    this.onPress(rowColState[0], rowColState[1], rowColState[2]);
                }
                break;
            }
        }


    }

    private stateToString(): string {
        let out: string = '{';
        let flag: boolean = false;
        for (const rowCol in this.localState) {
            if (flag) {
                out += ","
            }
            out += `"${rowCol}":${JSON.stringify(this.localState[rowCol])}`
            flag = true
        }

        out += '}'

        return out;


    }


    private async setLight(row: string, col: string, rgb: RGB) {
        if (row === 'H') {
            return;
        }

        this.localState[row + col] = rgb;
        // this.displayStateToConsole();
        SerialHandler.write(`change ${row + col} ${JSON.stringify(rgb)}`);


        this.sendToRenderer('light-change', this.localState);
    }


    /**
     *  Recalibrates all lights to the state reflected in the database.
     */
    private async recalibrate() {
        const currentState = await DatabaseHandler.getObject();

        for (const key of this.KEYS) {
            this.setLight(key[0], key[1], currentState[key]);
        }
    }

    private handleLinkedHeaders(col: string): void {
        switch (col) {
            case '0': {     //  Color
                this.setColor(ColorHandler.getNextColor());
                break;
            }
            case '1': {     //  Brightness
                this.setBrightness();
                break;
            }
            case '2': {
                SerialHandler.write('reset');
                DatabaseHandler.reset();
                break;
            }
            case '3': {

                break;
            }
            default: {
                console.log("Invalid header column passed: " + col)
                break;
            }
        }

    }

    private async onPress(row: string, col: string, state: KeyState): Promise<void> {
        if (this.inLinkedMode) {
            if (state !== 'down') {
                return;
            }

            if (row === 'H') {
                this.handleLinkedHeaders(col);
                return;
            }
            DatabaseHandler.onKeyPress(row, col, this.localState);

            return;
        }
        // Macro mode
        KeystrokeHandler.pressMacroKey(row + col, state);
    }



    private displayStateToConsole() {
        let s = '';

        for (let i = 0; i < this.KEYS.length; i++) {
            if (i % 4 === 0) {
                s += "\n";
            }

            const t = this.localState[this.KEYS[i]];

            if (t === undefined) {
                s += '#ZZZZZZ ';
            } else {
                s += ColorHandler.rgbToHex(t) + "  ";
            }
        }

        console.log(s);
    }

    private setColor(rgb: RGB): void {
        ColorHandler.setColor(rgb);
        Settings.setSettingValue('selected_color', ColorHandler.rgbToHex(ColorHandler.getCurrentColor()))
        SerialHandler.write(`selected-color [${ColorHandler.getCurrentColor()}]`);
        this.sendToRenderer('selected-color', ColorHandler.getCurrentColor());
    }

    private setBrightness(newBrightness?: number): void {
        let currentBrightness: number = Settings.getSettingValue('brightness');
        if (newBrightness !== undefined) { // brightness is supplied
            if (this.brightnessSteps.includes(currentBrightness)) {
                this.brightnessIndex = this.brightnessSteps.indexOf(currentBrightness);
            } else {
                for (let i = 0; i < this.brightnessSteps.length - 1; i++) {
                    if (currentBrightness > this.brightnessSteps[i] && currentBrightness < this.brightnessSteps[i + 1]) {
                        this.brightnessIndex = i;
                        break;
                    }
                }
            }

            currentBrightness = newBrightness;

        } else { // Go to next step
            if (!this.brightnessSteps.includes(currentBrightness)) { // Current brightness isn't on a step
                for (let i = 0; i < this.brightnessSteps.length - 1; i++) {
                    if (currentBrightness > this.brightnessSteps[i] && currentBrightness < this.brightnessSteps[i + 1]) {
                        this.brightnessIndex = i + 1;
                        break;
                    }
                }
            } else {
                this.brightnessIndex++;
                if (this.brightnessIndex > this.brightnessSteps.length - 1) {
                    this.brightnessIndex = 0;
                }
            }
            currentBrightness = this.brightnessSteps[this.brightnessIndex];
        }
        Settings.setSettingValue('brightness', currentBrightness);
        SerialHandler.write(`brightness ${currentBrightness}`);
        this.sendToRenderer('brightness-changed', currentBrightness);
    }



    public async handleEvent(eventType: string, ...data: any[]): Promise<any> {
        switch (eventType) {
            case "init": {
                this.initialize();
                break;
            }
            case 'button-press': {
                const row: string = data[0];
                const col: string = data[1];

                this.onPress(row, col, 'down');
                break;
            }

            case 'set-key': {
                const rowCol: string = data[0];
                const keyInfo: string[] = data[1];

                KeystrokeHandler.setKey(rowCol, keyInfo);
                this.sendToRenderer('update-keys', KeystrokeHandler.getKeyMap());
                break;
            }
            case 'linked-mode': {
                this.inLinkedMode = data[0] as boolean;
                SerialHandler.write(`linked-mode ${this.inLinkedMode ? 1 : 0} [${ColorHandler.getCurrentColor()}]`, undefined, true);
                SerialHandler.write(`linked-state ${this.stateToString()}`);

                Settings.setSettingValue('in_linked_mode', this.inLinkedMode);
                break;
            }
            case 'brightness-modified': {
                const brightnessPercentage: number = (data[0] as number) / 100;
                this.setBrightness(brightnessPercentage);
                break;
            }
            case 'selected-color-changed': {
                this.setColor(ColorHandler.hexToRGB(data[0]));
                break
            }
            case 'send-wifi': {
                const ssid: string = data[0];
                const password: string = data[1];

                SerialHandler.write(`wifi-setup ${ssid} ${password}`);
                break;
            }
            case 'exit-action': {
                const minimizeToTray: boolean = data[0];

                Settings.setSettingValue('exit_to_tray', minimizeToTray);
                break;
            }
            case 'macro-press-color': {
                Settings.setSettingValue('macro_press_color', data[0]);
                SerialHandler.write(`macro-press-color [${ColorHandler.hexToRGB(data[0])}]`)
                break;
            }
            case 'serial-port': {
                Settings.setSettingValue('serial_port', data[0]);
                break;
            }

            case 'colors-modified': {
                const hexString: string = data[0];

                let hexArray: string[] = hexString.split(' ').filter(w => w);

                let valid: boolean = hexArray.length > 0;
                for (const hex of hexArray) {
                    if (!ColorHandler.isValidHex(hex)) {
                        valid = false;
                    }
                }

                if (valid) {
                    Settings.setSettingValue('color_list', hexArray.join(' '));
                } else {
                    if (hexArray.length === 0) {
                        Settings.setSettingValue('color_list', Settings.getSettingByID('color_list').getDefaultValue());
                    } else {
                        // Don't set value
                    }
                }

                hexArray = Settings.getSettingValue('color_list').split(" ").filter((w: string) => w);

                ColorHandler.setColorList(hexArray);

                this.sendToRenderer('color-options', ColorHandler.getAvailableColors());

                if (ColorHandler.getColorIndex(ColorHandler.getCurrentColor()) === -1) {
                    this.setColor(ColorHandler.getAvailableColors()[0]);
                }
                this.sendToRenderer('selected-color', ColorHandler.getCurrentColor());
                SerialHandler.write(`color-options ${ColorHandler.getAvailableColors().map(ColorHandler.rgbToHex)}`);

                break;
            }


            default: {
                console.log(`Uncaught event: ${eventType}`);
                break;
            }

        }
    }

}

