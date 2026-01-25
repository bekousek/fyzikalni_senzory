/**
 * Školní rozšíření pro fyzikální měření: Teplota, Síla, Vzdálenost.
 */
//% weight=120 color=#2E8B57 icon="\uf0c3" block="Fyzikální senzory"
namespace FyzikalniSenzory {

    export enum RychlostniJednotka {
        //% block="m/s"
        Ms,
        //% block="km/h"
        Kmh
    }

    export enum VzdalenostniJednotka {
        //% block="cm"
        Cm,
        //% block="m"
        M
    }

    // ==========================================
    // --- 1. TEPLOMĚR (DS18B20) ---
    // ==========================================

    //% block="změřená teplota (°C) na pinu %pin"
    //% group="1. Teplota"
    //% weight=100
    //% parts="ds18b20"
    export function zmeritTeplotu(pin: DigitalPin): number {
        return dstemp.celsius(pin);
    }

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

    let my_offset = 0;
    // Kalibrace dle tvého měření (-10578)
    let my_scale = -10578;

    let last_dout = DigitalPin.P15;
    let last_sck = DigitalPin.P16;

    //% block="změřená síla (N) | DT %doutPin | SCK %sckPin"
    //% group="2. Síla"
    //% weight=90
    export function zmeritSilu(doutPin: DigitalPin, sckPin: DigitalPin): number {
        last_dout = doutPin;
        last_sck = sckPin;

        HX711.SetPIN_DOUT(doutPin);
        HX711.SetPIN_SCK(sckPin);
        HX711.begin();

        // Medián (3 hodnoty)
        let val1 = HX711.read();
        let val2 = HX711.read();
        let val3 = HX711.read();

        let maxVal = Math.max(val1, Math.max(val2, val3));
        let minVal = Math.min(val1, Math.min(val2, val3));
        let raw_median = (val1 + val2 + val3) - maxVal - minVal;

        if (my_scale == 0) my_scale = 1;
        let val = (raw_median - my_offset) / my_scale;

        return Math.round(val * 10) / 10;
    }

    //% block="změřit sílu a kreslit graf | DT %doutPin | SCK %sckPin"
    //% group="2. Síla"
    //% weight=89
    export function zmeritSiluAGraf(doutPin: DigitalPin, sckPin: DigitalPin): void {
        let f = zmeritSilu(doutPin, sckPin);
        serial.writeValue("Sila (N)", f);
        basic.pause(50);
    }

    //% block="vynulovat siloměr (tára)"
    //% group="2. Síla"
    //% weight=88
    export function tarovatSilomer(): void {
        HX711.SetPIN_DOUT(last_dout);
        HX711.SetPIN_SCK(last_sck);
        HX711.begin();

        let pole: number[] = [];
        for (let i = 0; i < 5; i++) {
            pole.push(HX711.read());
            basic.pause(10);
        }
        pole.sort((a, b) => a - b);
        my_offset = pole[2];
    }

    //% block="kalibrovat siloměr (dílků na 1 N): %meritko"
    //% group="2. Síla"
    //% advanced=true
    export function nastavitMeritko(meritko: number): void {
        if (meritko == 0) meritko = 1;
        my_scale = meritko;
    }


    // ==========================================
    // --- 3. VZDÁLENOST A RYCHLOST ---
    // ==========================================

    let lastS = 0;
    let lastT = 0;

    /**
     * Změří vzdálenost (zabudovaný sonar přímo v kódu).
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Použijeme naši interní funkci, která je kopií té z knihovny sonar
        let d_cm = measureDistanceCm(trigPin, echoPin);

        // Aktualizace paměti pro rychlost (aby navazovala)
        if (d_cm > 0) {
            lastS = d_cm;
            lastT = control.millis() / 10;
        }

        if (jednotka == VzdalenostniJednotka.Cm) {
            return Math.round(d_cm);
        } else {
            return Math.round((d_cm / 100) * 100) / 100; // Metry na 2 desetinná
        }
    }

    //% block="změřit vzdálenost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    //% blockGap=30
    export function zmeritVzdalenostAGraf(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let val = zmeritVzdalenost(jednotka, trigPin, echoPin);

        if (jednotka == VzdalenostniJednotka.Cm) serial.writeValue("Vzdalenost (cm)", val);
        else serial.writeValue("Vzdalenost (m)", val);

        basic.pause(60);
    }

    /**
     * Vypočítá rychlost.
     * Vzorec: v = (s - lastS) / (t - lastT)
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // 1. Změříme aktuální 's' (v cm)
        let s = measureDistanceCm(trigPin, echoPin);

        // 2. Změříme aktuální 't' (v desetinách sekundy, dle tvého kódu)
        let t = control.millis() / 10;

        if (s == 0) return 0; // Chyba senzoru

        // První spuštění
        if (lastT == 0) {
            lastS = s;
            lastT = t;
            return 0;
        }

        // 3. Výpočet
        let dt = t - lastT;
        if (dt <= 0) return 0;

        let v = (s - lastS) / dt;

        // 4. Uložení
        lastS = s;
        lastT = t;

        // 5. Převod
        if (jednotka == RychlostniJednotka.Ms) {
            return v; // Je to v m/s
        } else {
            return v * 3.6; // km/h
        }
    }

    //% block="změřit rychlost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=69
    export function zmeritRychlostAGraf(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let v = zmeritRychlost(jednotka, trigPin, echoPin);

        if (jednotka == RychlostniJednotka.Ms) serial.writeValue("Rychlost (m/s)", v);
        else serial.writeValue("Rychlost (km/h)", v);

        basic.pause(100);
    }

    // --- INTERNÍ FUNKCE (Kopie z knihovny sonar) ---
    // Toto řeší problém "Cannot find name 'sonar'"
    function measureDistanceCm(trig: DigitalPin, echo: DigitalPin): number {
        // send pulse
        pins.setPull(trig, PinPullMode.PullNone);
        pins.digitalWritePin(trig, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trig, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trig, 0);

        // read pulse (max distance 500cm = 500 * 58 micros)
        const d = pins.pulseIn(echo, PulseValue.High, 500 * 58);

        // Vracíme cm (vycházíme z toho, že 58us = 1cm)
        // Používám float dělení pro přesnost rychlosti, u vzdálenosti si to zaokrouhlí blok
        return d / 58;
    }
}