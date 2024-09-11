import { existsSync } from "original-fs";
import { ColorHandler, RGB } from "./ColorHandler";
import { StorageHandler } from "./StorageHandler";


export class Setting<T = any> {

    public readonly displayName: string;
    public readonly id: string;
    public readonly hidden: boolean;

    private value: T;
    private readonly defaultValue: T;


    constructor(displayName: string, id: string, defaultValue: T, hidden: boolean = false) {
        this.displayName = displayName;
        this.id = id;
        this.defaultValue = defaultValue;
        this.value = defaultValue;
        this.hidden = hidden;

    }

    public setValue(value: T) {
        this.value = value;
    }

    public getValue(): T {
        return this.value;
    }

    public getDefaultValue(): T {
        return this.defaultValue;
    }

}


export class Settings {

    private static readonly FILE: string = 'settings.json';

    private static settingList: Setting[] = [
        new Setting<string>('Selected Color', 'selected_color', '#ffffff', true),
        new Setting<number>('Brightness', 'brightness', 0.1, true),
        new Setting<boolean>('In Linked Mode', 'in_linked_mode', false, true),
        new Setting<number>('Window Width', 'window_width', 1920, true),
        new Setting<number>('Window Height', 'window_height', 1080, true),
        new Setting<boolean>('Window Maximized', 'window_maximized', false, true),
        new Setting<number>('Window Maximized', 'window_x', 50, true),
        new Setting<number>('Window Maximized', 'window_y', 50, true),

        new Setting<string>('Macro Press Color', 'macro_press_color', '#ffffff'),
        new Setting<boolean>("Exit to tray", 'exit_to_tray', true),
        new Setting<string>("Serial Port", 'serial_port', 'COM3'),
        new Setting<string>("Colors", 'color_list', ColorHandler.getAvailableColors().join(' ')),
    ];

    public static init(): void {
        const settings: string | null = StorageHandler.readFromModuleStorage(this.FILE);
        if (settings !== null) {
            try {
                const settingsObject: { [settingID: string]: any } = JSON.parse(settings);

                for (const id in settingsObject) {
                    this.setSettingValue(id, settingsObject[id]);
                }
            } catch (err) {
                console.log(err);
            }


        }

        StorageHandler.writeToStorage(this.FILE, JSON.stringify(this.getSettingMap(), undefined, 4));
    }


    public static getSettingByID(settingID: string): Setting {
        for (const setting of this.settingList) {
            if (setting.id === settingID) {
                return setting;
            }
        }
        console.log(`No setting with ID '${settingID}' found.`)
        return undefined;
    }

    public static setSettingValue(settingID: string, value: any): void {
        this.getSettingByID(settingID)?.setValue(value);


        StorageHandler.writeToStorage(this.FILE, JSON.stringify(this.getSettingMap(), undefined, 4));
    }

    public static getSettingValue(settingID: string): any {
        return this.getSettingByID(settingID)?.getValue();
    }

    public static getSettingMap(): { [settingID: string]: any } {
        const out: { [settingID: string]: any } = {};

        for (const setting of this.settingList) {
            out[setting.id] = setting.getValue();
        }

        return out;
    }



}

