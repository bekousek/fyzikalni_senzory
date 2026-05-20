# Fyzikální Senzory pro micro:bit ⚗️📏

Toto rozšíření je navrženo speciálně pro výuku fyziky na základních a středních školách. Umožňuje jednoduché připojení a měření s levnými, běžně dostupnými senzory.

Rozšíření se zaměřuje na robustnost, jednoduchost bloků a přímý fyzikální výstup vhodný pro školní měření a grafy.

## Podporované senzory
1.  **Teploměr** (DS18B20)
2.  **Siloměr a Váha** (Tenzometr + HX711)
3.  **Vzdálenost a Rychlost** (Ultrazvukový senzor HC-SR04)
4.  **Tlakoměr** (Tlakové čidlo + HX710B)
5.  **Teploměr a Vlhkoměr** (DHT11)

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

<img width="500" alt="Schéma zapojení rezistoru" src="https://github.com/user-attachments/assets/3153f56d-6161-4774-875c-416756711fbe" />

* **Černý/Modrý:** GND
* **Červený:** 3V
* **Žlutý/Bílý (Data):** Libovolný Pin (např. P0)

Osvědčilo se mi rezistor připájet přímo k jednomu z krokodýlů a propojit ho vodičem s druhým krokodýlem. Rezistor se tak schová do "punčochy" krokodýlu a nehrozí, že se někde utrhne.

<img width="600" alt="Fotografie připojeného rezistoru" src="https://github.com/user-attachments/assets/9cd6e67a-8ac1-4d07-834f-77c5b41aad54" />

### Použití v kódu
Rozšíření nabízí dva hlavní bloky:
* **`změřená teplota (°C)`**: Vrací číselnou hodnotu (např. `24.5`). Vhodné pro zobrazení na displeji, podmínky nebo vlastní logiku.
* **`změřit teplotu a kreslit graf`**: Automaticky změří teplotu, pošle ji na sériovou linku (pro vykreslení grafu v počítači) a počká 1 sekundu.

> **Poznámka:** Měření teploty trvá cca 750 ms. Bloky mají zabudovanou ochranu, aby neblokovaly procesor příliš dlouho, ale nečtěte teplotu v cyklu rychleji než 1x za sekundu.

---

## 2. Siloměr a Váha (HX711) ⚖️
Měření síly (v Newtonech) nebo hmotnosti pomocí tenzometrického členu pro max 20 kg a převodníku HX711.

### Zapojení
Převodník HX711 vyžaduje dva piny: **DT** (Data) a **SCK** (Clock).

* **VCC:** 3V
* **GND:** GND
* **DT:** Např. P15
* **SCK:** Např. P16

<!-- TODO: doplnit fotografii / schéma zapojení siloměru -->

### Kalibrace a Tárování
Jelikož každý tenzometr je jiný a po zapnutí vykazuje "šum", je nutné dodržet tento postup:

1.  **Tárování (Nulování):**
    V bloku `po stisknutí tlačítka A` zavolejte blok `vynulovat siloměr (tára)`. Tím se aktuální stav nastaví jako 0 N. Udělejte to poté, co spustíte měření a budete mít siloměr připravený v poloze pro měření. Vynulování proběhne spolehlivě i během běžícího grafu – tlačítko stačí stisknout jednou, není potřeba ho „spamovat".

2.  **Kalibrace (Měřítko):**
    Rozšíření má přednastavenou hodnotu kalibrace pro zavěšování závaží pod bližší závitovou díru. Pokud Vaše měření neodpovídá realitě, nebo chcete zvýšit přesnost, použijte blok `kalibrovat siloměr`.
    * Změřte sílu se známým závažím (např. 100g = 1N).
    * Pokud siloměr ukazuje špatnou hodnotu, upravte kalibrační číslo.

### Použití
* **`změřená síla (N)`**: Vrací sílu s přesností na 1 desetinné místo. Používá mediánový filtr pro odstranění šumu a náhodných výkyvů.
* **`změřit sílu a kreslit graf`**: Měří spojitě s pauzou 50 ms.

---

## 3. Vzdálenost a Rychlost (Sonar HC-SR04) 🏎️
Měření polohy a okamžité rychlosti pohybu (např. vozíčku nebo ruky).

### Zapojení
Senzor HC-SR04 využívá ultrazvuk. Pozor na napájení – některé verze vyžadují 5V, pro micro:bit hledejte 3V verze (HC-SR04P) nebo použijte 5V z externího zdroje (s děličem napětí na Echo pinu).

* **VCC:** 3V (nebo 5V)
* **GND:** GND
* **Trig:** Např. P1
* **Echo:** Např. P2

### Princip měření rychlosti
Toto rozšíření nepoužívá průměrování rychlosti, aby byla zachována fyzikální podstata okamžité změny polohy.
Rychlost se počítá podle vzorce:
$$v = \frac{\Delta s}{\Delta t} = \frac{s_{teď} - s_{minule}}{t_{teď} - t_{minule}}$$

### Použití
* **`změřená vzdálenost`**: Měří vzdálenost v `cm` nebo `m`.
* **`změřená rychlost`**: Vypočítá rychlost z aktuálního a předchozího měření. Lze volit mezi `m/s` a `km/h`.
* **Grafy:** Bloky pro grafy (`... a kreslit graf`) automaticky posílají data do počítače.
* **Přepínač `i graf vzdálenosti`:** Blok `změřit rychlost a kreslit graf` umí vykreslovat zároveň i vzdálenost, aby žáci mohli porovnávat oba grafy. Vzdálenost se bere přímo z hodnoty, ze které se počítá rychlost, takže grafy spolu přesně časově sedí. Když chcete sledovat jen rychlost, přepněte tento přepínač na `OFF`.

Velmi pěknou úlohou pro žáky je nechat je naprogramovat měření okamžité rychlosti. Jedno možné řešení je zde (zapisování na sériový port je to "kreslení grafu"):

<img width="600" alt="Příklad programu pro měření okamžité rychlosti" src="https://github.com/user-attachments/assets/e389f808-ba7a-486f-a8a5-9137f75669a9" />

---

## 4. Tlakoměr (HX710B) 🎈
Měření tlaku plynů a kapalin pomocí tlakového čidla s 24bitovým převodníkem HX710B.

### Zapojení
Modul HX710B používá stejný komunikační protokol jako HX711 u siloměru – potřebuje dva piny: **DT** (Data) a **SCK** (Clock).

* **VCC:** 3V
* **GND:** GND
* **DT (OUT):** Např. P0
* **SCK:** Např. P1

> **Pozor:** Pokud používáte siloměr i tlakoměr zároveň, zapojte každý na **jiné piny**. Tlakoměr má přednastavené piny P0 a P1, siloměr P15 a P16.

### Kalibrace a Tárování
Stejně jako siloměr i tlakoměr vrací jen surová "dílková" čísla, která je potřeba převést na fyzikální jednotky:

1.  **Tárování (Nulování):**
    Blokem `vynulovat tlakoměr (tára)` nastavíte aktuální tlak (typicky okolní atmosférický) jako 0 Pa. Hodí se, když chcete měřit *přetlak* nebo *podtlak* oproti okolí. Vynulování proběhne spolehlivě i během běžícího grafu – tlačítko stačí stisknout jednou.

2.  **Kalibrace (Měřítko):**
    Blok `kalibrovat tlakoměr` určuje, kolik dílků převodníku odpovídá 1 Pa. Rozšíření je předkalibrované podle atmosférického tlaku (ověřeno proti údaji ČHMÚ), takže běžné měření tlaku vzduchu funguje rovnou. Pokud Vám měření přesto nesedí (každý kus čidla je trochu jiný), porovnejte údaj se známým tlakem a měřítko tímto blokem upravte.

### Použití
* **`změřený tlak`**: Vrací tlak v jednotkách `Pa`, `hPa` nebo `atm`. Používá mediánový filtr pro potlačení šumu.
* **`změřit tlak a kreslit graf`**: Měří spojitě s pauzou 100 ms a posílá data do počítače.

> **Tip:** Pro meteorologii se hodí `hPa` (běžný atmosférický tlak je cca 1013 hPa), pro školní pokusy s injekčními stříkačkami spíš `Pa` nebo `atm`.

---

## 5. Teploměr a Vlhkoměr (DHT11) 💧
Senzor DHT11 měří jediným čidlem současně **teplotu vzduchu** i jeho **relativní vlhkost**. Je ideální pro sledování klimatu ve třídě, pokusy s dýcháním, sušením nebo odpařováním.

### Zapojení
DHT11 se prodává buď jako samostatné čidlo (3 nebo 4 nožičky), nebo jako hotový modul na destičce. Modul má pull-up rezistor už zabudovaný a zapojuje se nejsnáz.

* **VCC / +:** 3V
* **GND / -:** GND
* **DATA / OUT / S:** Libovolný Pin (např. P0)

> **Poznámka:** U holého čidla bez destičky je vhodné mezi datový pin a 3V připojit pull-up rezistor (cca 4k7–10k). Rozšíření navíc zapíná i vnitřní pull-up micro:bitu, takže s modulem na destičce žádný rezistor řešit nemusíte.

### Použití v kódu
* **`změřená teplota DHT11 (°C)`**: Vrací teplotu vzduchu ve stupních Celsia.
* **`změřená vlhkost vzduchu DHT11`**: Vrací relativní vlhkost vzduchu (hodnota 0–100, v procentech).
* **`změřit teplotu a vlhkost a kreslit graf`**: Změří obě veličiny najednou a pošle je na sériovou linku – v grafu uvidíte dvě křivky současně.

> **Poznámka:** DHT11 je pomalý senzor – novou hodnotu zvládne změřit zhruba jen 1x za sekundu. Bloky proto mají zabudovanou paměť: pokud o hodnotu požádáte dříve než po 1,5 s, vrátí poslední změřená data. Díky tomu můžete bez obav volat blok pro teplotu i pro vlhkost hned za sebou. Při neúspěšném čtení (např. špatné spojení) bloky vrátí poslední platnou hodnotu, hned po startu případně hodnotu `-999`.

> **Tip:** DHT11 měří s přesností přibližně ±2 °C a ±5 %. Potřebujete-li přesněji změřit teplotu (zejména kapalin), použijte vodotěsný DS18B20 ze sekce 1.

---

## Jak pracovat s grafy
* **Grafy v reálném čase:** Po nahrání kódu do micro:bitu klikněte v editoru na tlačítko **Zobrazit data Zařízení**. Uvidíte živé grafy měření.
* Pokud chcete s daty pracovat více, vpravo nahoře se dají exportovat jako prostý text nebo jako csv soubor.

## Autor
Vytvořil Ondřej Bek pro potřeby výuky fyziky na ZŠ.
Licence: MIT
