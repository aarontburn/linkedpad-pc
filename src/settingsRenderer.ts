(() => {
    const CHANNEL_NAME: string = ":3";

    function sendToProcess(eventType: string, ...data: any[]) {
        return window.ipc.send(CHANNEL_NAME, eventType, ...data);
    }

    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === null) {
            console.log("Could not find element with ID: " + id);
        }
        return query;
    }

    function getInputElement(id: string): HTMLInputElement {
        return getElement(id) as HTMLInputElement;
    }


    let wifiConnectionStatus: boolean = false;
    window.ipc.on(CHANNEL_NAME, async (_, eventType: string, ...data: any[]) => {
        switch (eventType) {
            case 'wifi-change': {
                const status: number = data[0];
                const wifiStatus: HTMLElement = getElement('wifi-status');

                switch (status) {
                    case 0: {
                        wifiStatus.innerHTML = 'Connecting...';
                        wifiStatus.style.color = 'yellow';
                        wifiConnectionStatus = true;
                        break;
                    }
                    case -1: {
                        wifiStatus.innerHTML = 'Disconnected';
                        wifiStatus.style.color = 'red';
                        wifiConnectionStatus = false;

                        break;
                    }
                    case 1: {
                        wifiStatus.innerHTML = 'Connected';
                        wifiStatus.style.color = 'green';
                        wifiConnectionStatus = false;
                        break;
                    }
                }

                break;
            }
            case 'settings': {
                const settingObj: { [settingID: string]: any } = data[0];

                getInputElement('macro-color-input').value = `${settingObj['macro_press_color']}`
                getInputElement(settingObj['exit_to_tray'] === true ? 'exit-to-tray-radio' : 'exit-radio').checked = true;
                getInputElement('serial-port-input').value = `${settingObj['serial_port']}`
                break;
            }
            case 'status': {
                const statusObj: { [key: string]: any } = data[0];

                const temp: number = statusObj['temp'];
                const wifiConnection: boolean = statusObj['wifi'];

                if (!wifiConnectionStatus) {
                    const wifiStatus: HTMLElement = getElement('wifi-status');
                    wifiStatus.innerHTML = wifiConnection ? 'Connected' : "Disconnected";
                    wifiStatus.style.color = wifiConnection ? 'green' : 'red';
                }

                break;
            }
        }
    });

    const macroColorInput: HTMLInputElement = getInputElement('macro-color-input');
    macroColorInput.addEventListener('input', () => {
        sendToProcess('macro-press-color', macroColorInput.value);
        getElement('macro-color-display').style.backgroundColor = macroColorInput.value;
    });

    const slider: HTMLInputElement = getInputElement('brightness-setting')
    slider.addEventListener('input', () => {
        sendToProcess('brightness-modified', slider.value);
    });



    getElement('send-wifi').addEventListener('click', () => {
        const ssid: string = getInputElement('wifi-ssid').value;
        const password: string = getInputElement('wifi-password').value;

        sendToProcess('send-wifi', ssid, password);
    });

    const radioButtons: string[] = ['exit-to-tray-radio', 'exit-radio'];
    for (const radioButton of radioButtons) {
        const input: HTMLInputElement = getInputElement(radioButton);
        input.addEventListener('change', () => {
            sendToProcess('exit-action', JSON.parse(input.value));
        });
    }

    getInputElement('serial-save-input').addEventListener('click', () => {
        const port: string = getInputElement('serial-port-input').value;

        sendToProcess('serial-port', port);
    });





})()