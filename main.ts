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

        // Medián (3 hodnoty) - zůstává, u siloměru fungoval dobře
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

    // Globální proměnné pro výpočet rychlosti (paměť)
    let lastS = 0;
    let lastT = 0;

    /**
     * Změří vzdálenost pomocí externí knihovny pxt-sonar.
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // Volání externí knihovny 'sonar'
        // PingUnit.Centimeters vrací celé centimetry
        // PingUnit.MicroSeconds vrací čas

        if (jednotka == VzdalenostniJednotka.Ms) {
            let d_us = sonar.ping(trigPin, echoPin, PingUnit.MicroSeconds);
            return Math.round(d_us / 1000); // Převod na ms
        }

        // Pro cm a m měříme v cm
        let d_cm = sonar.ping(trigPin, echoPin, PingUnit.Centimeters);

        // Aktualizace paměti pro rychlost (aby navazovala)
        if (d_cm > 0) {
            lastS = d_cm;
            lastT = control.millis() / 10;
        }

        if (jednotka == VzdalenostniJednotka.Cm) {
            return d_cm;
        } else {
            return d_cm / 100; // Metry
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
     * Vypočítá rychlost na základě tvého vzorce: v = (s - lastS) / (t - lastT).
     * Používá t = millis() / 10.
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        // 1. Změříme aktuální 's' (v cm) pomocí knihovny sonar
        let s = sonar.ping(trigPin, echoPin, PingUnit.Centimeters);

        // 2. Změříme aktuální 't' (v desetinách sekundy)
        let t = control.millis() / 10;

        // Ošetření nuly ze senzoru (chyba měření) - rychlost nepočítáme
        if (s == 0) return 0;

        // Inicializace při prvním spuštění
        if (lastT == 0) {
            lastS = s;
            lastT = t;
            return 0;
        }

        // 3. Výpočet (přesně podle tvého zadání)
        // v = (s - lastS) / (t - lastT)
        // Jednotky: cm / (0.1 s) = 10 cm / s = 0.1 m/s
        // Tedy výsledek "v" je přímo v [m/s]!

        let dt = t - lastT;

        // Ochrana proti dělení nulou (kdyby to běželo moc rychle)
        if (dt <= 0) return 0;

        let v = (s - lastS) / dt;

        // 4. Uložení pro příště
        lastS = s;
        lastT = t;

        // 5. Převod a návrat
        if (jednotka == RychlostniJednotka.Ms) {
            return v; // Už je to v m/s
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

        // Pauza, aby se 't' stihlo změnit
        basic.pause(100);
    }
}