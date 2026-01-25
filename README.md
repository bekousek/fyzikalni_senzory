# Fyzikální Senzory pro micro:bit ⚗️📏

Toto rozšíření je navrženo speciálně pro výuku fyziky na základních a středních školách. Umožňuje jednoduché připojení a měření s levnými, běžně dostupnými senzory.

Rozšíření se zaměřuje na robustnost, jednoduchost bloků a přímý fyzikální výstup vhodný pro školní měření a grafy.

## Podporované senzory
1.  **Teploměr** (DS18B20)
2.  **Siloměr a Váha** (Tenzometr + HX711)
3.  **Vzdálenost a Rychlost** (Ultrazvukový senzor HC-SR04)

---

## 🛠️ Jak přidat rozšíření do MakeCode
1.  Otevřete [MakeCode pro micro:bit](https://makecode.microbit.org/).
2.  Vytvořte nový projekt.
3.  Klikněte na **Rozšíření** (Extensions) v menu ozubeného kola.
4.  Do vyhledávání zadejte URL tohoto repozitáře: `https://github.com/bekousek/fyzikalni_senzory` (nebo jen *Fyzikalni senzory*).
5.  Klikněte na dlaždici rozšíření pro import.

---

## 1. Teploměr (DS18B20) 🌡️
Měření teploty kapalin a vzduchu pomocí vodotěsné sondy.

### Zapojení
Senzor DS18B20 vyžaduje pull-up rezistor (4k7) mezi datovým pinem a napájením (3V).

<img width="824" height="790" alt="Schéma zapojení rezistoru" src="https://github.com/user-attachments/assets/3153f56d-6161-4774-875c-416756711fbe" />

* **Černý/Modrý:** GND
* **Červený:** 3V
* **Žlutý/Bílý (Data):** Libovolný Pin (např. P0)

Osvědčilo se mi rezistor připájet přímo k jednomu z krokodýlů a propojit ho vodičem s druhým krokodýlem.

<img width="4000" height="2252" alt="Fotografie připojeného rezistoru" src="https://github.com/user-attachments/assets/9cd6e67a-8ac1-4d07-834f-77c5b41aad54" />


### Použití v kódu
Rozšíření nabízí dva hlavní bloky:
* **`změřená teplota (°C)`**: Vrací číselnou hodnotu (např. `24.5`). Vhodné pro zobrazení na displeji, podmínky nebo vlastní logiku.
* **`změřit teplotu a kreslit graf`**: Automaticky změří teplotu, pošle ji na sériovou linku (pro vykreslení grafu v počítači) a počká 1 sekundu.

> **Poznámka:** Měření teploty trvá cca 750 ms. Bloky mají zabudovanou ochranu, aby neblokovaly procesor příliš dlouho, ale nečtěte teplotu v cyklu rychleji než 1x za sekundu.

---

## 2. Siloměr a Váha (HX711) ⚖️
Měření síly (v Newtonech) nebo hmotnosti pomocí tenzometrického členu a převodníku HX711.

### Zapojení
Převodník HX711 vyžaduje dva piny: **DT** (Data) a **SCK** (Clock).

* **VCC:** 3V
* **GND:** GND
* **DT:** Např. P0
* **SCK:** Např. P1

![Schéma zapojení siloměru](SEM_VLOZ_ODKAZ_NA_OBRAZEK_SILOMERU)

### Kalibrace a Tárování
Jelikož každý tenzometr je jiný a po zapnutí vykazuje "šum", je nutné dodržet tento postup:

1.  **Tárování (Nulování):**
    V bloku `po stisknutí tlačítka A` **musíte** zavolat blok `vynulovat siloměr (tára)`. Tím se aktuální stav nastaví jako 0 N. Udělejte to poté, co spustíte měření a budete mít siloměr připravený v poloze pro měření.

2.  **Kalibrace (Měřítko):**
    Rozšíření má přednastavenou hodnotu kalibrace pro zavěšování závaží pod bližší závitovou díru. Pokud Vaše měření neodpovídá realitě, nebo chcete zvýšit přesnost, použijte blok `kalibrovat siloměr`.
    * Změřte sílu se známým závažím (např. 100g = 1N).
    * Pokud siloměr ukazuje špatnou hodnotu, upravte kalibrační číslo.

### Použití
* **`změřená síla (N)`**: Vrací sílu s přesností na 1 desetinné místo. Používá mediánový filtr pro odstranění šumu a náhodných výkyvů.
* **`změřit sílu a kreslit graf`**: Měří spojitě s pauzou 50 ms. 

---

## 3. Vzdálenost a Rychlost (Sonar HC-SR04) 🏎️
Měření polohy a okamžité rychlosti pohybu (např. vozíčku nebo chodce).

### Zapojení
Senzor HC-SR04 využívá ultrazvuk. Pozor na napájení – některé verze vyžadují 5V, pro micro:bit hledejte 3V verze (HC-SR04P) nebo použijte 5V z externího zdroje (s děličem napětí na Echo pinu).

* **VCC:** 3V (nebo 5V)
* **GND:** GND
* **Trig:** Např. P1
* **Echo:** Např. P2

![Schéma zapojení sonaru](SEM_VLOZ_ODKAZ_NA_OBRAZEK_SONARU)

### Princip měření rychlosti
Toto rozšíření nepoužívá průměrování rychlosti, aby byla zachována fyzikální podstata okamžité změny polohy.
Rychlost se počítá podle vzorce:
$$v = \frac{\Delta s}{\Delta t} = \frac{s_{teď} - s_{minule}}{t_{teď} - t_{minule}}$$

### Použití
* **`změřená vzdálenost`**: Měří vzdálenost v `cm` nebo `m`.
* **`změřená rychlost`**: Vypočítá rychlost z aktuálního a předchozího měření. Lze volit mezi `m/s` a `km/h`.
* **Grafy:** Bloky pro grafy (`... a kreslit graf`) automaticky posílají data do počítače. U rychlosti je vhodné nastavit pauzu smyčky alespoň na 100–200 ms pro stabilní výpočet.

<img width="776" height="592" alt="image" src="https://github.com/user-attachments/assets/e389f808-ba7a-486f-a8a5-9137f75669a9" />

---

## 💡 Tipy pro výuku
* **Grafy v reálném čase:** Po nahrání kódu do micro:bitu klikněte v editoru na tlačítko **Zobrazit konzoli (Show Console) Device**. Uvidíte živé grafy měření.
* **Rychlost:** Při měření rychlosti rukou se snažte o plynulý pohyb. Ultrazvuk se odráží od pevných ploch, měkké oblečení může signál pohlcovat.

## Autor
Vytvořeno pro potřeby výuky fyziky na ZŠ.
Licence: MIT
