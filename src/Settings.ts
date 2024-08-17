

export class Settings {

    public static registerSettings(): void {
        new Setting<string>('Selected Color', '#ffffff') 
    }





}


class Setting<T> {

    private value: T;

    constructor(name: string, defaultValue: T) {
        this.value = defaultValue;
    }

    public setValue(value: T) {
        this.value = value;
    }

    public getValue(): T {
        return this.value;
    }
}