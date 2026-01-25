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

    // Kalibrace (dle tvého posledního měření)
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
    // --- 3. VZDÁLENOST A RYCHLOST (Paměťová logika) ---
    // ==========================================

    // Globální proměnné pro uložení stavu z minulého měření
    let _lastS = 0; // Vzdálenost v cm
    let _lastT = 0; // Čas v milisekundách

    /**
     * Změří vzdálenost.
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        let raw_cm = measureRawCm(trigPin, echoPin);

        // Aktualizujeme paměť i při pouhém měření vzdálenosti, 
        // aby následné měření rychlosti nemělo "skok"
        _lastS = raw_cm;
        _lastT = control.millis();

        if (raw_cm <= 0) return 0;

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
     * Vypočítá rychlost na základě změny od posledního měření.
     * Funguje přesně jako vzorec: v = (s - lastS) / (t - lastT)
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // 1. Zjistíme aktuální hodnoty
        let now = control.millis();
        let s = measureRawCm(trigPin, echoPin);

        // 2. Ošetření prvního spuštění nebo chyby senzoru
        if (_lastT == 0 || s <= 0) {
            _lastS = s;
            _lastT = now;
            return 0;
        }

        // 3. Výpočet Delta (rozdíly)
        let dt = now - _lastT;     // Čas v ms od minula
        let ds = s - _lastS;       // Změna dráhy v cm

        // Pokud je smyčka moc rychlá (dt=0), vrátíme 0 (dělení nulou)
        if (dt <= 0) return 0;

        // 4. Výpočet rychlosti podle tvého vzorce
        // Tvůj kód: t = millis/10.  v = ds / (t - lastT).
        // To znamená: v = cm / (10ms). 
        // 1 cm / 10 ms = 100 cm / 1000 ms = 1 m/s.
        // Takže tvůj vzorec dává přímo metry za sekundu.

        // Fyzikální přepočet pro jistotu:
        // v [cm/ms] = ds / dt
        // v [m/s] = (ds / 100) / (dt / 1000) = (ds * 10) / dt

        let v_ms = (ds * 10) / dt;

        // 5. Uložení stavu pro příští cyklus
        _lastS = s;
        _lastT = now;

        // 6. Návrat hodnoty
        if (jednotka == RychlostniJednotka.Ms) {
            return Math.round(v_ms * 10) / 10; // m/s
        } else {
            return Math.round((v_ms * 3.6) * 10) / 10; // km/h
        }
    }

    //% block="změřit rychlost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=69
    export function zmeritRychlostAGraf(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let v = zmeritRychlost(jednotka, trigPin, echoPin);

        if (jednotka == RychlostniJednotka.Ms) serial.writeValue("Rychlost (m/s)", v);
        else serial.writeValue("Rychlost (km/h)", v);

        // Zde je pauza důležitá - určuje "dt" pro příští smyčku
        // Pokud žák nepoužije vlastní pauzu, tato zajistí minimální rozestup
        basic.pause(100);
    }

    // Interní pomocná funkce
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