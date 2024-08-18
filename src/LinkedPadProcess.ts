import { KeystrokeHandler } from "./KeystrokeHandler";
import { ColorHandler, RGB } from "./ColorHandler";
import { SerialHandler } from "./SerialHandler";
import { DatabaseHandler } from "./DatabaseHandler";







export class LinkedPadProcess {

    private readonly KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    private readonly HEADERS: string[] = ["H0", "H1", "H2", "H3"];

    private localState: { [rowCol: string]: RGB } = (() => {
        const obj: { [rowCol: string]: RGB } = {};
        for (const rowCol of this.KEYS) {
            obj[rowCol] = [0, 0, 0];
        }
        return obj;
    })();

    private inLinkedMode: boolean = false;


    // 0.01, 0.1, 0.2, ..., 0.9, 1
    private brightnessSteps: number[] = [0.01, ...Array.from({ length: 10 }, (_, i) => (i + 1) / 10)];
    private brightness: number = this.brightnessSteps[0];
    private brightnessIndex: number = 0;




    private readonly sendToRenderer: (...args: any[]) => void;

    public constructor(sendToRenderer: (...args: any[]) => void) {
        this.sendToRenderer = sendToRenderer;
    }

    public initialize(): void {
        SerialHandler.init(
            this.onPress.bind(this),
            (() => {
                this.sendToRenderer('connection-status', 1) // 1 means connecting
            }).bind(this),
            (() => {
                this.sendToRenderer('connection-status', 2) // 2 means connected
            }).bind(this)
        );


        KeystrokeHandler.init();
        DatabaseHandler.initDatabase(this.recalibrate.bind(this), this.setLight.bind(this));


        this.setBrightness(this.brightnessSteps[0])
        this.sendToRenderer('update-keys', KeystrokeHandler.getKeyMap());
        this.sendToRenderer('key-options', KeystrokeHandler.getKeyGroups());
        this.sendToRenderer('color-options', ColorHandler.getAvailableColors());
        this.sendToRenderer('selected-color', ColorHandler.getCurrentColor());
    }

    public onExit(): void {
        SerialHandler.stop()
    }


    private async setLight(row: string, col: string, rgb: RGB, writeState: boolean = true) {
        this.localState[row + col] = rgb;
        // this.displayStateToConsole();
        SerialHandler.write(`change ${row + col} ${JSON.stringify(rgb)}`)


        this.sendToRenderer('light-change', this.localState)
    }


    /**
     *  Recalibrates all lights to the state reflected in the database.
     */
    private async recalibrate() {
        const currentState = await DatabaseHandler.getObject();

        for (const key of this.KEYS) {
            this.setLight(key[0], key[1], currentState[key], false);
        }
    }

    private handleLinkedHeaders(col: string): void {
        switch (col) {
            case '0': {     //  Color
                this.setColor(ColorHandler.getNextColor())
                break;
            }
            case '1': {     //  Brightness
                this.setBrightness();
                break;
            }
            case '2': {

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

    private async onPress(row: string, col: string): Promise<void> {
        if (this.inLinkedMode) {
            if (row === 'H') {
                this.handleLinkedHeaders(col);
                return;
            }
            DatabaseHandler.onKeyPress(row, col, this.localState);
            return;
        }
        // Macro mode
        KeystrokeHandler.pressMacroKey(row + col);
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
        SerialHandler.write(`rgb [${ColorHandler.getCurrentColor()}]`)
        this.sendToRenderer('selected-color', ColorHandler.getCurrentColor());
    }

    private setBrightness(newBrightness?: number): void {
        if (newBrightness !== undefined) { // brightness is supplied by slider
            for (let i = 0; i < this.brightnessSteps.length - 1; i++) {
                if (this.brightness > this.brightnessSteps[i] && this.brightness < this.brightnessSteps[i + 1]) {
                    this.brightnessIndex = i;
                    break;
                }
            }
            this.brightness = newBrightness;

        } else { // Go to next step
            if (!this.brightnessSteps.includes(this.brightness)) { // Current brightness isn't on a step
                // Go to next step
                for (let i = 0; i < this.brightnessSteps.length - 1; i++) {
                    if (this.brightness > this.brightnessSteps[i] && this.brightness < this.brightnessSteps[i + 1]) {
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
            this.brightness = this.brightnessSteps[this.brightnessIndex];
        }
        SerialHandler.write(`brightness ${this.brightness}`);
        this.sendToRenderer('brightness-changed', this.brightness);
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

                this.onPress(row, col);
                break;
            }

            case 'set-key': {
                const rowCol: string = data[0];
                const keyInfo: string | string[] = data[1];

                KeystrokeHandler.setKey(rowCol, keyInfo);
                this.sendToRenderer('update-keys', KeystrokeHandler.getKeyMap());
                break;
            }
            case 'linked-mode': {
                this.inLinkedMode = data[0];
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
        }
    }

}

