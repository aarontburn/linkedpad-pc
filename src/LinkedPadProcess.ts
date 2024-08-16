import * as path from "path";
import { MongoClient } from "mongodb";
import { KeystrokeHandler } from "./KeystrokeHandler";
import { ColorHandler, RGB } from "./ColorHandler";
import { SerialHandler } from "./SerialHandler";







export class LinkedPadProcess {

    private static readonly MODULE_NAME: string = "Linked Pad";
    private static readonly MODULE_ID: string = "aarontburn.Linked_Pad";
    private static readonly HTML_PATH: string = path.join(__dirname, "./LinkedPadHTML.html");


    private KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    private HEADERS: string[] = ["H0", "H1", "H2", "H3"];



    private ACCESS_ID = ':3';
    private URI = "mongodb+srv://admin:j2MzVYcewmPjnzrG@linkedpad.qrzkm98.mongodb.net/?retryWrites=true&w=majority&appName=linkedpad";

    private client = new MongoClient(this.URI);
    private database = this.client.db("pad_data");
    private collection = this.database.collection("data");


    private localState: any = {};
    private inLinkedMode: boolean = false;


    private ready: boolean = false;
    private sendToRenderer: (...args: any[]) => void = undefined


    public constructor(sendToRenderer: (...args: any[]) => void) {
        this.sendToRenderer = sendToRenderer;

    }

    public initialize(): void {
        SerialHandler.init(this.onPress.bind(this));

        KeystrokeHandler.init();

        this.sendToRenderer('update-keys', KeystrokeHandler.getKeyMap());
        this.sendToRenderer('key-options', KeystrokeHandler.getKeyGroups());
        this.sendToRenderer('color-options', ColorHandler.getAvailableColors());

        this.initDatabase();



    }

    public onExit(): void {
        SerialHandler.stop()
    }


    private async initDatabase() {
        console.log("Initializing...");

        this.checkDatabase().then(() => {
            this.collection.findOne({}).then(async data => {
                this.ready = true;
                await this.recalibrate();
                this.listen().catch(this.initDatabase); // Reboot if error
            });
        });
    }

    private async checkDatabase() {
        if (await this.collection.estimatedDocumentCount() === 1) {
            const entry = await this.getObject();

            if (entry !== null) {
                if (Object.keys(entry).sort().toString() === [...this.KEYS, '_id', 'accessID'].sort().toString()) { // All keys are valid
                    console.log("Database is properly initialized.");
                    return;
                }
            }
        }

        console.log("WARNING: Database needs to be re-setup.");
        await this.collection.deleteMany({});
        await this.reset();
    }

    /**
     *  Listens to any database changes.
     */
    private async listen(): Promise<void> {
        try {
            const changeStream: any = this.collection.watch();
            console.log("Listening for changes...");

            // Print change events as they occur
            for await (const change of changeStream) {
                if (change && change.updateDescription && change.updateDescription.updatedFields) {
                    this.onDatabaseChange(change.updateDescription.updatedFields);
                }
            }
            await changeStream.close();

        } finally {
            await this.client.close();
        }
    }


    /**
     *  An event that triggers when the database object is modified.
     *  @param changeObject     An object containing all keys and new states for each button.
     */
    private async onDatabaseChange(changeObject: { [rowCol: string]: RGB }) {
        for (const rowCol in changeObject) {
            if (!this.KEYS.includes(rowCol)) { // Maybe not needed?
                continue;
            }

            const row: string = rowCol[0];
            const col: string = rowCol[1];
            const newValue: RGB = changeObject[rowCol];

            this.setLight(row, col, newValue);
        }
    }

    /**
     *  Reset all buttons to 0
     */
    private async reset() {
        // Iterate over A0, A1, ... D3, D4 and reset their entries to 0
        const object: any = {};
        for (const key of this.KEYS) {
            object[key] = ColorHandler.OFF;
        }
        object['accessID'] = this.ACCESS_ID;
        const result = await this.collection.findOneAndUpdate(
            { 'accessID': this.ACCESS_ID },
            { '$set': object }, { returnDocument: 'after', upsert: true });

        for (const key in result) {
            this.setLight(key[0], key[1], 0);
        }
    }

    private async getObject() {
        return await this.collection.findOne({ 'accessID': this.ACCESS_ID });
    }

    private async setLight(row: string, col: string, isOn: any) {
        this.localState[row + col] = isOn;
        // this.displayStateToConsole();
        this.sendToRenderer('light-change', this.localState)
    }

    /**
     *  Recalibrates all lights to the state reflected in the database.
     */
    private async recalibrate() {
        const currentState = await this.getObject();

        for (const key of this.KEYS) {
            this.setLight(key[0], key[1], currentState[key]);
        }
    }

    private handleLinkedHeaders(col: string): void {
        switch (col) {
            case '0': {
                ColorHandler.nextColor()
                console.log("New color: " + JSON.stringify(ColorHandler.getCurrentColor()))
                break;
            }
            case '1': {

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
            if (!this.ready) {
                return;
            }
            if (row === 'H') {
                this.handleLinkedHeaders(col);
                return;
            }
            try {
                const isOff: boolean = ColorHandler.isEqual(this.localState[row + col], ColorHandler.OFF)

                await this.collection.findOneAndUpdate(
                    { 'accessID': this.ACCESS_ID },
                    { "$set": { [row + col]: isOff ? ColorHandler.getCurrentColor() : ColorHandler.OFF } }
                )
            } catch (e) {
                console.log("DB no longer connected. Reinitializing...");

                this.initDatabase()
            }

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



    public async handleEvent(eventType: string, ...data: any[]): Promise<any> {
        switch (eventType) {
            case "init": {
                this.initialize();
                break;
            }
            case 'button-click': {
                const row: string = data[0];
                const col: string = data[1];

                this.onPress(row, col);

                break;
            }
            case 'reset': {
                this.reset()
                break;
            }
            case 'set-key': {
                const rowCol: string = data[0];
                const keyInfo: string | string[] = data[1];

                console.log(`${rowCol} (mode: ${typeof keyInfo === 'string' ? 'TEXT' : 'KEYS'}) ${keyInfo}`);
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
                console.log(brightnessPercentage)

                break;
            }
        }
    }

}

