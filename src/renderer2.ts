(() => {
    type RGB = [number, number, number];

    const CHANNEL_NAME: string = ":3";

    function sendToProcess(eventType: string, ...data: any[]) {
        return window.ipc.send(CHANNEL_NAME, eventType, ...data);
    }

    function rgbToHex(color: RGB): string {
        const componentToHex: (c: number) => string = (c: number) => {
            const hex: string = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
    }

    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === null) {
            console.log("Could not find element with ID: " + id);
        }
        return query;
    }

    const padTab: HTMLElement = getElement('pad-tab');
    const settingsTab: HTMLElement = getElement('settings-tab');

    getElement('pad-tab-button').addEventListener('click', () => {
        padTab.style.display = 'flex';
        settingsTab.style.display = 'none';
    });

    getElement('settings-tab-button').addEventListener('click', () => {
        padTab.style.display = 'none';
        settingsTab.style.display = 'flex';
    });

    window.ipc.on(CHANNEL_NAME, async (_, eventType: string, ...data: any[]) => {
        switch (eventType) {
            case 'color-options': {
                const colorList: HTMLElement = getElement('color-list');
                while (colorList.firstChild) {
                    colorList.removeChild(colorList.firstChild);
                }


                const colors: RGB[] = data[0];


                for (const rgb of colors) {
                    const hex: string = rgbToHex(rgb).substring(1); // get rid of the #
                    colorList.insertAdjacentHTML('beforeend', `
                        <div 
                            class='color'  
                            style='background-color: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]});'
                            id='color-${hex}'
                            >
                        </div>
                        `
                    )

                    const element: HTMLElement = getElement(`color-${hex}`);
                    element.addEventListener('click', () => {
                        sendToProcess('selected-color-changed', hex);
                    });
                }

                (getElement('color-setting-list') as HTMLInputElement).value = colors.map(rgbToHex).join(' ');
                break;
            }
            case 'brightness-changed': {
                const brightness: number = data[0];
                const percent: number = Math.round(brightness * 100)
                getElement('brightness-label').innerHTML = `Brightness (${percent}%)`;
                getElement('brightness-setting-label').innerHTML = `Brightness (${percent}%)`;

                (getElement('brightness-slider') as HTMLInputElement).value = `${percent}`;
                (getElement('brightness-setting') as HTMLInputElement).value = `${percent}`;
                break;
            }
            case 'connection-status': {
                const status: 0 | 1 | 2 = data[0];
                const statusText: HTMLSpanElement = getElement('status');
                switch (status) {
                    case 0: {
                        statusText.innerHTML = 'Disconnected'
                        statusText.style.color = 'red';
                        break;
                    }
                    case 1: {
                        statusText.innerHTML = 'Check software';
                        statusText.style.color = 'yellow';
                        break;
                    }
                    case 2: {
                        statusText.innerHTML = 'Connected'
                        statusText.style.color = 'green';
                        break;
                    }
                }
                break;
            }


        }

    })

    const brightnessSlider: HTMLInputElement = getElement('brightness-slider') as HTMLInputElement;
    brightnessSlider.addEventListener('input', () => {
        sendToProcess('brightness-modified', brightnessSlider.value);
    });


    const toggle: HTMLInputElement = getElement('keys-text-toggle') as HTMLInputElement;
    const textToggle: HTMLElement = getElement('text-toggle')
    const keyToggle: HTMLElement = getElement('key-toggle')
    const enterCheckbox: HTMLInputElement = getElement('enter-checkbox') as HTMLInputElement;
    toggle.addEventListener('change', () => {
        textToggle.style.display = !toggle.checked ? 'none' : 'inline-block';
        enterCheckbox.style.display = !toggle.checked ? 'none' : 'flex';

        keyToggle.style.display = toggle.checked ? 'none' : 'flex';

    });



})();