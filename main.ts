/**
 * Školní rozšíření pro práci se senzory: Sonar, Váha HX711, Teploměr DS18B20.
 */
//% weight=100 color=#d65cd6 icon="\uf0ad" block="Školní Senzory"
namespace SkolniSenzory {

    // --- SONAR (HC-SR04) ---

    /**
     * Změří vzdálenost pomocí ultrazvukového senzoru HC-SR04.
     * @param trigPin Pin připojený na Trig
     * @param echoPin Pin připojený na Echo
     */
    //% block="změřit vzdálenost (cm) | Trig %trigPin | Echo %echoPin"
    //% group="Sonar (Vzdálenost)"
    export function zmeritVzdalenost(trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Reset triggeru
        pins.digitalWritePin(trigPin, 0);
        control.waitMicros(2);

        // Vyslání impulsu (10 mikrosekund)
        pins.digitalWritePin(trigPin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trigPin, 0);

        // Čtení odezvy (max 23200 mikrosekund = cca 4 metry, pak timeout)
        const d = pins.pulseIn(echoPin, PulseValue.High, 23200);

        // Převod na cm (rychlost zvuku 340 m/s -> 0.034 cm/us -> děleno 2 (tam a zpět) -> d / 58)
        let vzdalenost = Math.idiv(d, 58);

        if (vzdalenost <= 0) return 0;
        return vzdalenost;
    }

    // --- VÁHA (HX711) ---

    let hx711_dout = DigitalPin.P0;
    let hx711_sck = DigitalPin.P1;
    let hx711_offset = 0;
    let hx711_scale = 1;

    /**
     * Inicializace váhy HX711. Musí se zavolat při startu.
     * @param doutPin Pin připojený na DT (Data)
     * @param sckPin Pin připojený na SCK (Clock)
     */
    //% block="nastavit váhu HX711 | DT %doutPin | SCK %sckPin"
    //% group="Váha (HX711)"
    //% weight=90
    export function nastavitVahu(doutPin: DigitalPin, sckPin: DigitalPin): void {
        hx711_dout = doutPin;
        hx711_sck = sckPin;
        pins.digitalWritePin(hx711_sck, 0);
    }

    function cistSurovaData(): number {
        // Čekání na připravenost senzoru
        let timeout = 1000;
        while (pins.digitalReadPin(hx711_dout) == 1 && timeout > 0) {
            timeout--;
            control.waitMicros(1);
        }
        if (timeout <= 0) return 0;

        let hodnota = 0;
        // Čtení 24 bitů
        for (let i = 0; i < 24; i++) {
            pins.digitalWritePin(hx711_sck, 1);
            control.waitMicros(1);
            hodnota = hodnota << 1;
            pins.digitalWritePin(hx711_sck, 0);
            control.waitMicros(1);
            if (pins.digitalReadPin(hx711_dout) == 1) {
                hodnota++;
            }
        }

        // 25. pulz pro gain 128
        pins.digitalWritePin(hx711_sck, 1);
        control.waitMicros(1);
        pins.digitalWritePin(hx711_sck, 0);
        control.waitMicros(1);

        // Ošetření záporných čísel (doplňkový kód)
        if ((hodnota & 0x800000) > 0) {
            hodnota |= 0xFF000000;
        }

        return hodnota;
    }

    /**
     * Vynuluje váhu (tára).
     */
    //% block="vynulovat váhu (tára)"
    //% group="Váha (HX711)"
    //% weight=80
    export function tarovatVahu(): void {
        let suma = 0;
        for (let i = 0; i < 5; i++) {
            suma += cistSurovaData();
            basic.pause(50);
        }
        hx711_offset = Math.idiv(suma, 5);
    }

    /**
     * Změří hmotnost.
     */
    //% block="změřit hmotnost"
    //% group="Váha (HX711)"
    //% weight=70
    export function zmeritHmotnost(): number {
        let val = cistSurovaData();
        return Math.idiv((val - hx711_offset), hx711_scale);
    }

    /**
     * Nastaví kalibrační měřítko.
     * @param meritko Číslo, kterým se dělí surová data (např. 1000)
     */
    //% block="kalibrovat měřítko váhy %meritko"
    //% group="Váha (HX711)"
    //% weight=60
    export function nastavitMeritko(meritko: number): void {
        if (meritko == 0) meritko = 1;
        hx711_scale = meritko;
    }


    // --- TEPLOMĚR (DS18B20) ---

    /**
     * Změří teplotu z DS18B20.
     * @param pin Pin připojený k senzoru
     */
    //% block="změřit teplotu (°C) DS18B20 na pinu %pin"
    //% group="Teploměr (DS18B20)"
    export function zmeritTeplotu(pin: DigitalPin): number {
        // Voláme funkci z importované knihovny dstemp
        return dstemp.celsius(pin);
    }
}