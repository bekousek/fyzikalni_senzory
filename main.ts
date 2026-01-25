/**
 * Školní rozšíření pro fyzikální měření: Teplota, Síla, Vzdálenost.
 */
//% weight=100 color=#2E8B57 icon="\uf0c3" block="Fyzikální senzory"
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
        M,
        //% block="ms (čas)"
        Ms
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

    // Globální proměnné přesně podle tvého vzoru
    let lastS = 0;
    let lastT = 0;

    /**
     * Změří vzdálenost.
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Voláme naši interní kopii sonaru
        // 1: Centimeters, 0: MicroSeconds

        if (jednotka == VzdalenostniJednotka.Ms) {
            let d_us = InternalSonar.ping(trigPin, echoPin, 0);
            return Math.round(d_us / 1000);
        }

        let s = InternalSonar.ping(trigPin, echoPin, 1); // 1 = Centimeters

        // Aktualizace paměti pro rychlost
        if (s > 0) {
            lastS = s;
            lastT = control.millis() / 10;
        }

        if (jednotka == VzdalenostniJednotka.Cm) {
            return s;
        } else {
            return s / 100;
        }
    }

    //% block="změřit vzdálenost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    //% blockGap=30
    export function zmeritVzdalenostAGraf(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let val = zmeritVzdalenost(jednotka, trigPin, echoPin);

        if (jednotka == VzdalenostniJednotka.Cm) serial.writeValue("Vzdalenost (cm)", val);
        else if (jednotka == VzdalenostniJednotka.M) serial.writeValue("Vzdalenost (m)", val);
        else serial.writeValue("Cas (ms)", val);

        basic.pause(200);
    }

    /**
     * Vypočítá rychlost.
     * Používá tvou logiku: t = millis/10, v = (s-lastS)/(t-lastT)
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // 1. Měření "s" (cm)
        let s = InternalSonar.ping(trigPin, echoPin, 1);

        // 2. Měření "t" (desetiny sekundy)
        let t = control.millis() / 10;


        // Inicializace
        if (lastT == 0) {
            lastS = s;
            lastT = t;
            return 0;
        }

        // 3. Výpočet
        let dt = t - lastT;
        if (dt <= 0) return 0;

        // v = (s - lastS) / dt
        // Výsledek "v" je v jednotkách [cm / 0.1s] = [10 cm/s] = [0.1 m/s]
        // Příklad: s=100, lastS=0, t=10 (1s), lastT=0.
        // v = 100 / 10 = 10.
        // Skutečná rychlost je 1 m/s.
        // Takže v = 10 odpovídá 1 m/s.

        let raw_v = (s - lastS) / dt;

        // 4. Uložení
        lastS = s;
        lastT = t;

        // 5. Převod na m/s nebo km/h
        // Pokud raw_v = 10, chceme 1 m/s. Tedy dělit 10.
        let v_ms = raw_v / 10;

        if (jednotka == RychlostniJednotka.Ms) {
            return v_ms;
        } else {
            return v_ms * 3.6;
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
}

// =============================================================================
// --- INTERNÍ SONAR KNIHOVNA (Kopie 1:1 z pxt-sonar) ---
// =============================================================================
// Umístěna mimo hlavní namespace, aby simulovala externí knihovnu.
// Toto zajistí, že měření bude fungovat úplně stejně jako v originále.

namespace InternalSonar {
    /**
     * Send a ping and get the echo time (in microseconds) as a result
     * @param trig tigger pin
     * @param echo echo pin
     * @param unit desired conversion unit (0 = us, 1 = cm, 2 = inches)
     * @param maxCmDistance maximum distance in centimeters (default is 500)
     */
    export function ping(trig: DigitalPin, echo: DigitalPin, unit: number, maxCmDistance = 500): number {
        // send pulse
        pins.setPull(trig, PinPullMode.PullNone);
        pins.digitalWritePin(trig, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trig, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trig, 0);

        // read pulse
        const d = pins.pulseIn(echo, PulseValue.High, maxCmDistance * 58);

        switch (unit) {
            case 1: return Math.idiv(d, 58); // Centimeters
            case 2: return Math.idiv(d, 148); // Inches
            default: return d; // Microseconds
        }
    }
}