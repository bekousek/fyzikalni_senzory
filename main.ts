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

    // Offset necháme 0. Tára se musí provést softwarově po startu.
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

    let _lastS = 0;
    let _lastT = 0;

    /**
     * Změří vzdálenost.
     * Používá medián ze 3 měření pro stabilitu, ale nezahazuje nuly.
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Změříme 3x rychle po sobě
        let d1 = measureRawCm(trigPin, echoPin);
        control.waitMicros(2000); // 2ms pauza mezi pingy
        let d2 = measureRawCm(trigPin, echoPin);
        control.waitMicros(2000);
        let d3 = measureRawCm(trigPin, echoPin);

        // Najdeme medián (prostřední hodnotu)
        // Pokud jedna hodnota uletí (chyba), medián ji zahodí.
        // Pokud zakryješ senzor, všechny 3 budou 0 -> medián bude 0.
        let maxD = Math.max(d1, Math.max(d2, d3));
        let minD = Math.min(d1, Math.min(d2, d3));
        let raw_cm = (d1 + d2 + d3) - maxD - minD;

        // Aktualizujeme paměť pro příští výpočet rychlosti
        _lastS = raw_cm;
        _lastT = control.millis();

        switch (jednotka) {
            case VzdalenostniJednotka.Cm:
                return Math.floor(raw_cm);
            case VzdalenostniJednotka.M:
                return Math.round((raw_cm / 100) * 100) / 100;
            case VzdalenostniJednotka.Ms:
                return Math.round((raw_cm * 58.0 / 1000) * 10) / 10;
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
        else if (jednotka == VzdalenostniJednotka.M) serial.writeValue("Vzdalenost (m)", val);
        else serial.writeValue("Cas (ms)", val);
        basic.pause(60);
    }

    /**
     * Vypočítá rychlost.
     * Bere surová data "teď" vs "minule". Žádné filtry.
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        let now = control.millis();

        // Změříme mediánem (aby měření bylo spolehlivé)
        let d1 = measureRawCm(trigPin, echoPin);
        control.waitMicros(2000);
        let d2 = measureRawCm(trigPin, echoPin);
        control.waitMicros(2000);
        let d3 = measureRawCm(trigPin, echoPin);

        let maxD = Math.max(d1, Math.max(d2, d3));
        let minD = Math.min(d1, Math.min(d2, d3));
        let s = (d1 + d2 + d3) - maxD - minD;

        // Pokud je to první spuštění
        if (_lastT == 0) {
            _lastS = s;
            _lastT = now;
            return 0;
        }

        let dt = now - _lastT;
        let ds = s - _lastS;

        if (dt <= 0) return 0;

        // Výpočet rychlosti [cm/ms] * 10 = [m/s]
        let v_ms = (ds * 10) / dt;

        _lastS = s;
        _lastT = now;

        if (jednotka == RychlostniJednotka.Ms) {
            return Math.round(v_ms * 10) / 10;
        } else {
            return Math.round((v_ms * 3.6) * 10) / 10;
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

    function measureRawCm(trigPin: DigitalPin, echoPin: DigitalPin): number {
        pins.digitalWritePin(trigPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trigPin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trigPin, 0);

        const d = pins.pulseIn(echoPin, PulseValue.High, 23500);
        if (d <= 0) return 0;
        return d / 58.0;
    }
}