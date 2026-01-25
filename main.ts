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
    // --- 3. VZDÁLENOST A RYCHLOST (SONAR) ---
    // ==========================================

    // Globální paměť sdílená všemi bloky sonaru
    let _lastS = 0;
    let _lastT = 0;
    let _lastV = 0;

    /**
     * Změří vzdálenost. Zároveň aktualizuje data pro výpočet rychlosti.
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Voláme sdílenou funkci
        updateSonarData(trigPin, echoPin);

        let s = _lastS;

        switch (jednotka) {
            case VzdalenostniJednotka.Cm:
                return s;
            case VzdalenostniJednotka.M:
                return s / 100;
            default:
                return 0;
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

        // ZVÝŠENÁ PAUZA (150 ms)
        basic.pause(150);
    }

    /**
     * Vrátí rychlost. Využívá stejný měřící cyklus jako vzdálenost.
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Změříme S, spočítáme V, uložíme
        updateSonarData(trigPin, echoPin);

        let v_cm_s = _lastV;

        if (jednotka == RychlostniJednotka.Ms) {
            return v_cm_s / 100.0; // m/s
        } else {
            return (v_cm_s / 100.0) * 3.6; // km/h
        }
    }

    //% block="změřit rychlost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=69
    export function zmeritRychlostAGraf(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let v = zmeritRychlost(jednotka, trigPin, echoPin);

        if (jednotka == RychlostniJednotka.Ms) serial.writeValue("Rychlost (m/s)", v);
        else serial.writeValue("Rychlost (km/h)", v);

        // ZVÝŠENÁ PAUZA (150 ms)
        basic.pause(200);
    }

    // =========================================================================
    // --- SDÍLENÉ JÁDRO PRO SONAR ---
    // =========================================================================

    function updateSonarData(trig: DigitalPin, echo: DigitalPin): void {
        let t = control.millis();
        let s = InternalSonar.ping(trig, echo, 1); // cm

        // Platné rozmezí a filtrace chyb
        if (s == 0 || s >= 400) return;

        // Inicializace
        if (_lastS == 0 && _lastT == 0) {
            _lastS = s;
            _lastT = t;
            _lastV = 0;
            return;
        }

        // Výpočet rychlosti
        let dt = (t - _lastT) / 1000.0; // sekundy

        // Filtr času: aspoň 20 ms
        if (dt > 0.02) {
            let v = (s - _lastS) / dt;
            _lastV = v;

            _lastS = s;
            _lastT = t;
        }
    }
}

// =============================================================================
// --- INTERNÍ SONAR ---
// =============================================================================
namespace InternalSonar {
    export function ping(trig: DigitalPin, echo: DigitalPin, unit: number, maxCmDistance = 500): number {
        pins.setPull(trig, PinPullMode.PullNone);
        pins.digitalWritePin(trig, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trig, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trig, 0);

        const d = pins.pulseIn(echo, PulseValue.High, maxCmDistance * 58);

        switch (unit) {
            case 1: return Math.idiv(d, 58); // Centimeters
            default: return d; // Microseconds
        }
    }
}