/**
 * Školní rozšíření pro fyzikální měření: Teplota, Síla, Vzdálenost.
 */
//% weight=100 color=#2E8B57 icon="\uf0c3" block="Fyzikální senzory"
namespace FyzikalniSenzory {

    // ==========================================
    // --- 1. TEPLOMĚR (DS18B20) ---
    // ==========================================

    /**
     * Změří teplotu z DS18B20.
     * Vyžaduje připojenou knihovnu dstemp.
     * @param pin Pin připojený k senzoru
     */
    //% block="změřená teplota (°C) na pinu %pin"
    //% group="1. Teplota"
    //% weight=100
    //% parts="ds18b20"
    export function zmeritTeplotu(pin: DigitalPin): number {
        return dstemp.celsius(pin);
    }

    /**
     * Změří teplotu, pošle ji do grafu a počká.
     * @param pin Pin připojený k senzoru
     */
    //% block="změřit teplotu a kreslit graf (pin %pin)"
    //% group="1. Teplota"
    //% weight=99
    export function zmeritTeplotuAGraf(pin: DigitalPin): void {
        let t = zmeritTeplotu(pin);
        serial.writeValue("Teplota (C)", t);
        // Teploměr potřebuje čas na konverzi, 1000 ms je bezpečné minimum.
        basic.pause(1000);
    }


    // ==========================================
    // --- 2. SILOMĚR (HX711) ---
    // ==========================================

    // Proměnné pro naši logiku
    let my_offset = 0;

    // KALIBRACE (nastavena na -10300 dle tvého měření)
    let my_scale = -10300;

    // Pamatujeme si poslední piny pro funkci Tára
    let last_dout = DigitalPin.P15;
    let last_sck = DigitalPin.P16;

    /**
     * Změří sílu v Newtonech. 
     * Automaticky nastaví piny a změří hodnotu.
     * @param doutPin Pin pro DT (Data)
     * @param sckPin Pin pro SCK (Clock)
     */
    //% block="změřená síla (N) | DT %doutPin | SCK %sckPin"
    //% group="2. Síla"
    //% weight=90
    export function zmeritSilu(doutPin: DigitalPin, sckPin: DigitalPin): number {
        // 1. Uložení pinů pro budoucí použití (tára)
        last_dout = doutPin;
        last_sck = sckPin;

        // 2. Nastavení pinů v externí knihovně HX711
        HX711.SetPIN_DOUT(doutPin);
        HX711.SetPIN_SCK(sckPin);

        // 3. Inicializace
        HX711.begin();

        // 4. Přečtení surové hodnoty
        let raw_val = HX711.read();

        // 5. Výpočet Newtonů: (raw - offset) / měřítko
        if (my_scale == 0) my_scale = 1;

        return Math.idiv((raw_val - my_offset), my_scale);
    }

    /**
     * Změří sílu, pošle ji do grafu a počká.
     */
    //% block="změřit sílu a kreslit graf | DT %doutPin | SCK %sckPin"
    //% group="2. Síla"
    //% weight=89
    export function zmeritSiluAGraf(doutPin: DigitalPin, sckPin: DigitalPin): void {
        let f = zmeritSilu(doutPin, sckPin);
        serial.writeValue("Sila (N)", f);
        // Krátká pauza, samotné čtení senzoru také chvíli trvá.
        basic.pause(50);
    }

    /**
     * Vynuluje siloměr (tára). 
     * Použije piny, které byly nastaveny v posledním měření.
     */
    //% block="vynulovat siloměr (tára)"
    //% group="2. Síla"
    //% weight=88
    export function tarovatSilomer(): void {
        // Pro jistotu znovu nastavíme piny
        HX711.SetPIN_DOUT(last_dout);
        HX711.SetPIN_SCK(last_sck);
        HX711.begin();

        let suma = 0;
        // Uděláme 3 měření pro průměr
        for (let i = 0; i < 3; i++) {
            suma += HX711.read();
            basic.pause(50);
        }
        my_offset = Math.idiv(suma, 3);
    }

    /**
     * Pokročilá kalibrace: Kolik surových jednotek odpovídá 1 Newtonu?
     */
    //% block="kalibrovat siloměr (dílků na 1 N): %meritko"
    //% group="2. Síla"
    //% advanced=true
    export function nastavitMeritko(meritko: number): void {
        if (meritko == 0) meritko = 1;
        my_scale = meritko;
    }


    // ==========================================
    // --- 3. VZDÁLENOST (HC-SR04) ---
    // ==========================================

    /**
     * Změří vzdálenost v cm.
     * @param trigPin Pin Trig
     * @param echoPin Pin Echo
     */
    //% block="změřená vzdálenost (cm) | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
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
     * Změří vzdálenost, pošle ji do grafu a počká.
     * @param trigPin Pin Trig
     * @param echoPin Pin Echo
     */
    //% block="změřit vzdálenost a kreslit graf | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    export function zmeritVzdalenostAGraf(trigPin: DigitalPin, echoPin: DigitalPin): void {
        let dist = zmeritVzdalenost(trigPin, echoPin);
        serial.writeValue("Vzdalenost (cm)", dist);
        // Pauza pro uklidnění odrazů zvuku (ghost echoes)
        basic.pause(60);
    }
}