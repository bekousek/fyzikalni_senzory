/**
 * Školní rozšíření pro fyzikální měření: Teplota, Síla, Vzdálenost.
 */
//% weight=100 color=#2E8B57 icon="\uf0c3" block="Fyzikální senzory"
namespace FyzikalniSenzory {

    /**
     * Jednotky pro měření rychlosti
     */
    export enum RychlostniJednotka {
        //% block="m/s"
        Ms,
        //% block="km/h"
        Kmh
    }

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
        HX711.SetPIN_DOUT(last_dout);
        HX711.SetPIN_SCK(last_sck);
        HX711.begin();

        let suma = 0;
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

        // Výpočet v cm
        let vzdalenost = d / 58;

        if (vzdalenost <= 0) return 0;
        return Math.floor(vzdalenost); // Vracíme celé cm
    }

    /**
     * Změří vzdálenost, pošle ji do grafu a počká.
     */
    //% block="změřit vzdálenost a kreslit graf | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    //% blockGap=30
    export function zmeritVzdalenostAGraf(trigPin: DigitalPin, echoPin: DigitalPin): void {
        let dist = zmeritVzdalenost(trigPin, echoPin);
        serial.writeValue("Vzdalenost (cm)", dist);
        basic.pause(60);
    }

    /**
     * Změří okamžitou rychlost.
     * (Provede dvě měření s odstupem 100 ms).
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // 1. První měření
        let t1 = input.runningTime();
        // Zde voláme přímo logiku měření, abychom neztratili desetinná místa u cm
        let d1 = measureRawCm(trigPin, echoPin);

        // 2. Pauza 100ms
        basic.pause(100);

        // 3. Druhé měření
        let t2 = input.runningTime();
        let d2 = measureRawCm(trigPin, echoPin);

        // 4. Výpočet
        let dt = (t2 - t1) / 1000.0; // čas v sekundách
        if (dt <= 0) return 0;

        let v_cm_s = (d2 - d1) / dt; // rychlost v cm/s

        // 5. Převod jednotek
        if (jednotka == RychlostniJednotka.Ms) {
            return v_cm_s / 100.0; // cm/s -> m/s
        } else {
            return (v_cm_s / 100.0) * 3.6; // m/s -> km/h
        }
    }

    /**
     * Změří rychlost, pošle ji do grafu a počká.
     */
    //% block="změřit rychlost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=69
    export function zmeritRychlostAGraf(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let v = zmeritRychlost(jednotka, trigPin, echoPin);

        if (jednotka == RychlostniJednotka.Ms) {
            serial.writeValue("Rychlost (m/s)", v);
        } else {
            serial.writeValue("Rychlost (km/h)", v);
        }
        basic.pause(50);
    }

    // Pomocná funkce pro přesnější měření (nezaokrouhlené cm)
    function measureRawCm(trigPin: DigitalPin, echoPin: DigitalPin): number {
        pins.digitalWritePin(trigPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trigPin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trigPin, 0);

        const d = pins.pulseIn(echoPin, PulseValue.High, 23200);
        if (d <= 0) return 0;
        return d / 58.0; // Vrací float
    }
}