/**
 * Školní rozšíření pro fyzikální měření: Teplota, Síla, Vzdálenost.
 */
//% weight=100 color=#d65cd6 icon="\uf0ad" block="Fyzikální senzory"
namespace FyzikalniSenzory {

    // ==========================================
    // --- 1. TEPLOMĚR (DS18B20) ---
    // ==========================================

    /**
     * Změří teplotu z DS18B20.
     * Vyžaduje připojenou knihovnu dstemp.
     * @param pin Pin připojený k senzoru
     */
    //% block="změřit teplotu (°C) na pinu %pin"
    //% group="1. Teplota"
    //% weight=100
    export function zmeritTeplotu(pin: DigitalPin): number {
        return dstemp.celsius(pin);
    }

    /**
     * Změří teplotu, pošle ji do grafu a počká 1 sekundu.
     * @param pin Pin připojený k senzoru
     */
    //% block="změřit teplotu a kresli graf (pin %pin)"
    //% group="1. Teplota"
    //% weight=99
    export function zmeritTeplotuAGraf(pin: DigitalPin): void {
        let t = zmeritTeplotu(pin);
        serial.writeValue("Teplota (C)", t);
        basic.pause(1000);
    }


    // ==========================================
    // --- 2. SILOMĚR (HX711) ---
    // ==========================================

    let hx711_dout = DigitalPin.P0;
    let hx711_sck = DigitalPin.P1;
    let hx711_offset = 0;
    let hx711_scale = 1; // Počet dílků na 1 Newton

    /**
     * Inicializace siloměru (HX711). Nutné volat při startu.
     * @param doutPin Pin pro DT (Data)
     * @param sckPin Pin pro SCK (Clock)
     */
    //% block="nastavit siloměr | DT %doutPin | SCK %sckPin"
    //% group="2. Síla (Siloměr)"
    //% weight=90
    export function nastavitSilomer(doutPin: DigitalPin, sckPin: DigitalPin): void {
        hx711_dout = doutPin;
        hx711_sck = sckPin;
        pins.digitalWritePin(hx711_sck, 0);
    }

    // Interní funkce pro čtení raw dat
    function cistSurovaData(): number {
        let timeout = 1000;
        while (pins.digitalReadPin(hx711_dout) == 1 && timeout > 0) {
            timeout--;
            control.waitMicros(1);
        }
        if (timeout <= 0) return 0;

        let hodnota = 0;
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

        pins.digitalWritePin(hx711_sck, 1);
        control.waitMicros(1);
        pins.digitalWritePin(hx711_sck, 0);
        control.waitMicros(1);

        if ((hodnota & 0x800000) > 0) {
            hodnota |= 0xFF000000;
        }
        return hodnota;
    }

    /**
     * Vynuluje siloměr (tára). Zavolejte, když na senzor nic nepůsobí.
     */
    //% block="vynulovat siloměr (tára)"
    //% group="2. Síla (Siloměr)"
    //% weight=88
    export function tarovatSilomer(): void {
        let suma = 0;
        for (let i = 0; i < 5; i++) {
            suma += cistSurovaData();
            basic.pause(50);
        }
        hx711_offset = Math.idiv(suma, 5);
    }

    /**
     * Kalibrace: Kolik surových jednotek odpovídá 1 Newtonu?
     * @param meritko Počet dílků na 1 N (např. 1000)
     */
    //% block="kalibrovat siloměr (dílků na 1 N): %meritko"
    //% group="2. Síla (Siloměr)"
    //% weight=87
    export function nastavitMeritko(meritko: number): void {
        if (meritko == 0) meritko = 1;
        hx711_scale = meritko;
    }

    /**
     * Změří sílu v Newtonech.
     */
    //% block="změřit sílu (N)"
    //% group="2. Síla (Siloměr)"
    //% weight=86
    export function zmeritSilu(): number {
        let val = cistSurovaData();
        return Math.idiv((val - hx711_offset), hx711_scale);
    }

    /**
     * Změří sílu, pošle ji do grafu a počká 1 sekundu.
     */
    //% block="změřit sílu a kresli graf"
    //% group="2. Síla (Siloměr)"
    //% weight=85
    export function zmeritSiluAGraf(): void {
        let f = zmeritSilu();
        serial.writeValue("Sila (N)", f);
        basic.pause(1000);
    }


    // ==========================================
    // --- 3. VZDÁLENOST (HC-SR04) ---
    // ==========================================

    /**
     * Změří vzdálenost v cm.
     * @param trigPin Pin Trig
     * @param echoPin Pin Echo
     */
    //% block="změřit vzdálenost (cm) | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    export function zmeritVzdalenost(trigPin: DigitalPin, echoPin: DigitalPin): number {
        pins.digitalWritePin(trigPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trigPin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trigPin, 0);

        const d = pins.pulseIn(echoPin, PulseValue.High, 23200);
        let vzdalenost = Math.idiv(d, 58);

        if (vzdalenost <= 0) return 0;
        return vzdalenost;
    }

    /**
     * Změří vzdálenost, pošle ji do grafu a počká 1 sekundu.
     * @param trigPin Pin Trig
     * @param echoPin Pin Echo
     */
    //% block="změřit vzdálenost a kresli graf | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    export function zmeritVzdalenostAGraf(trigPin: DigitalPin, echoPin: DigitalPin): void {
        let dist = zmeritVzdalenost(trigPin, echoPin);
        serial.writeValue("Vzdalenost (cm)", dist);
        basic.pause(1000);
    }
}