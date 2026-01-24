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

    // Výchozí piny (pokud by někdo zavolal táru dřív než měření)
    let hx711_dout = DigitalPin.P15;
    let hx711_sck = DigitalPin.P16;

    let hx711_offset = 0;

    // --- ZDE UPRAV VÝCHOZÍ KALIBRACI ---
    // Kolik dílků senzoru odpovídá 1 Newtonu?
    // Toto číslo musíš změřit a přepsat ho sem natvrdo.
    let hx711_scale = 1000;
    // -----------------------------------

    // Interní funkce pro čtení
    function cistSurovaData(): number {
        // Jednoduchý timeout
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

        // 25. pulz (gain 128)
        pins.digitalWritePin(hx711_sck, 1);
        control.waitMicros(1);
        pins.digitalWritePin(hx711_sck, 0);
        control.waitMicros(1);

        // Doplňkový kód
        if ((hodnota & 0x800000) > 0) {
            hodnota |= 0xFF000000;
        }
        return hodnota;
    }

    /**
     * Změří sílu v Newtonech. 
     * Piny se nastaví automaticky při měření.
     * @param doutPin Pin pro DT (Data)
     * @param sckPin Pin pro SCK (Clock)
     */
    //% block="změřit sílu (N) | DT %doutPin | SCK %sckPin"
    //% group="2. Síla (Siloměr)"
    //% weight=90
    export function zmeritSilu(doutPin: DigitalPin, sckPin: DigitalPin): number {
        // Aktualizace globálních pinů pro použití v Táře
        hx711_dout = doutPin;
        hx711_sck = sckPin;

        let val = cistSurovaData();
        // Ošetření dělení nulou
        if (hx711_scale == 0) hx711_scale = 1;

        return Math.idiv((val - hx711_offset), hx711_scale);
    }

    /**
     * Změří sílu, pošle ji do grafu a počká 1 sekundu.
     */
    //% block="změřit sílu a kresli graf | DT %doutPin | SCK %sckPin"
    //% group="2. Síla (Siloměr)"
    //% weight=89
    export function zmeritSiluAGraf(doutPin: DigitalPin, sckPin: DigitalPin): void {
        let f = zmeritSilu(doutPin, sckPin);
        serial.writeValue("Sila (N)", f);
        basic.pause(1000);
    }

    /**
     * Vynuluje siloměr (tára). 
     * Použije piny nastavené v posledním bloku "změřit sílu".
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
     * Pokročilá kalibrace: Kolik surových jednotek odpovídá 1 Newtonu?
     * (Standardně skryto v sekci "Více")
     * @param meritko Počet dílků na 1 N
     */
    //% block="kalibrovat siloměr (dílků na 1 N): %meritko"
    //% group="2. Síla (Siloměr)"
    //% advanced=true
    export function nastavitMeritko(meritko: number): void {
        if (meritko == 0) meritko = 1;
        hx711_scale = meritko;
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