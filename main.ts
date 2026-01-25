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

    /**
     * Jednotky pro měření vzdálenosti
     */
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

    // Offset necháme 0. Tára se musí provést softwarově po startu.
    let my_offset = 801.8;

    // NOVÉ KALIBRAČNÍ ČÍSLO (vypočteno z tvého měření 300g)
    let my_scale = -10578;

    let last_dout = DigitalPin.P15;
    let last_sck = DigitalPin.P16;

    /**
     * Změří sílu v Newtonech (na 1 desetinné místo).
     * Používá MEDIÁN ze 3 hodnot pro odstranění chyb (spiků).
     * @param doutPin Pin pro DT (Data)
     * @param sckPin Pin pro SCK (Clock)
     */
    //% block="změřená síla (N) | DT %doutPin | SCK %sckPin"
    //% group="2. Síla"
    //% weight=90
    export function zmeritSilu(doutPin: DigitalPin, sckPin: DigitalPin): number {
        last_dout = doutPin;
        last_sck = sckPin;

        HX711.SetPIN_DOUT(doutPin);
        HX711.SetPIN_SCK(sckPin);
        HX711.begin();

        // MEDIÁNOVÝ FILTR (3 hodnoty)
        let val1 = HX711.read();
        let val2 = HX711.read();
        let val3 = HX711.read();

        // Najdeme medián
        let maxVal = Math.max(val1, Math.max(val2, val3));
        let minVal = Math.min(val1, Math.min(val2, val3));
        let raw_median = (val1 + val2 + val3) - maxVal - minVal;

        if (my_scale == 0) my_scale = 1;

        // Výpočet
        let val = (raw_median - my_offset) / my_scale;

        // Zaokrouhlení na 1 desetinné místo
        return Math.round(val * 10) / 10;
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
     * Používá medián pro spolehlivé nulování.
     */
    //% block="vynulovat siloměr (tára)"
    //% group="2. Síla"
    //% weight=88
    export function tarovatSilomer(): void {
        HX711.SetPIN_DOUT(last_dout);
        HX711.SetPIN_SCK(last_sck);
        HX711.begin();

        // Přečteme 5 hodnot a seřadíme je
        let pole: number[] = [];
        for (let i = 0; i < 5; i++) {
            pole.push(HX711.read());
            basic.pause(10);
        }
        pole.sort((a, b) => a - b);

        // Uložíme medián (prostřední prvek) jako nový offset
        my_offset = pole[2];
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
     * Změří vzdálenost nebo čas odrazu.
     * @param jednotka cm, m, nebo ms (čas)
     * @param trigPin Pin Trig
     * @param echoPin Pin Echo
     */
    //% block="změřená vzdálenost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=80
    //% parts="sonar"
    export function zmeritVzdalenost(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        pins.digitalWritePin(trigPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(trigPin, 1);
        control.waitMicros(10);
        pins.digitalWritePin(trigPin, 0);

        const d = pins.pulseIn(echoPin, PulseValue.High, 23500);

        if (d <= 0) return 0;

        switch (jednotka) {
            case VzdalenostniJednotka.Cm:
                return Math.floor(d / 58);
            case VzdalenostniJednotka.M:
                return Math.round((d / 5800) * 100) / 100;
            case VzdalenostniJednotka.Ms:
                return Math.round((d / 1000) * 10) / 10;
            default:
                return 0;
        }
    }

    /**
     * Změří vzdálenost, pošle ji do grafu a počká.
     */
    //% block="změřit vzdálenost a kreslit graf v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=79
    //% blockGap=30
    export function zmeritVzdalenostAGraf(jednotka: VzdalenostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): void {
        let hodnota = zmeritVzdalenost(jednotka, trigPin, echoPin);

        if (jednotka == VzdalenostniJednotka.Cm) {
            serial.writeValue("Vzdalenost (cm)", hodnota);
        } else if (jednotka == VzdalenostniJednotka.M) {
            serial.writeValue("Vzdalenost (m)", hodnota);
        } else {
            serial.writeValue("Cas odrazu (ms)", hodnota);
        }

        basic.pause(60);
    }

    /**
     * Změří okamžitou rychlost.
     */
    //% block="změřená rychlost v %jednotka | Trig %trigPin | Echo %echoPin"
    //% group="3. Vzdálenost (Sonar)"
    //% weight=70
    export function zmeritRychlost(jednotka: RychlostniJednotka, trigPin: DigitalPin, echoPin: DigitalPin): number {
        let t1 = input.runningTime();
        let d1 = measureRawCm(trigPin, echoPin);

        basic.pause(100);

        let t2 = input.runningTime();
        let d2 = measureRawCm(trigPin, echoPin);

        let dt = (t2 - t1) / 1000.0;
        if (dt <= 0) return 0;

        let v_cm_s = (d2 - d1) / dt;
        let result = 0;

        if (jednotka == RychlostniJednotka.Ms) {
            result = v_cm_s / 100.0;
        } else {
            result = (v_cm_s / 100.0) * 3.6;
        }

        return Math.round(result * 10) / 10;
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