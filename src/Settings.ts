

export class Settings {







}


class Setting<T> {

    private value: T;

    constructor(defaultValue: T) {
        this.value = defaultValue;
    }

    public setValue(value: T) {
        this.value = value;
    }

    public getValue(): T {
        return this.value;
    }
}