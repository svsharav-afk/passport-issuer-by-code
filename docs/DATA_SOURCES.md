# Источник и лицензия данных

В расширение встроен срез справочника `hflabs/fms-unit`, закреплённый на commit `7d2d9a2c196147c45e9c87975e212ade8a342f82`.

- CSV: [fms_unit.csv](https://github.com/hflabs/fms-unit/blob/7d2d9a2c196147c45e9c87975e212ade8a342f82/fms_unit.csv)
- Метаданные upstream: [fms_unit.csv-metadata.json](../data/source/fms_unit.csv-metadata.json)
- Дата выпуска данных: **22.09.2026**
- Составитель в метаданных: **DaData.ru**
- Это справочный набор данных, а не официальный публичный реестр МВД.
- Runtime хранит данные локально и не обращается к DaData или другим API.
- Лицензия источника и производного набора: **[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)**
- SHA-256 исходного CSV: `f05a98e270c108afec76853fd8f694bbec7eeea985447ccceee5c731b5610ed4`

CSV включён в `data/source/`, а `scripts/build-data.mjs` группирует исходные строки по коду в `data/fms-units.json`. Названия копируются без исправлений регистра, формулировок или пунктуации; порядок исходных строк сохраняется. Встроенный runtime dataset содержит все **16 584** строки источника и **7 509** уникальных кодов. Конвертер сверяет количество и последовательность каждой пары `code,name`.

При распространении CSV или подготовленного JSON нужно сохранить атрибуцию `HFLabs / DaData.ru`, указать ссылку на CC BY-SA 4.0 и отметить преобразование CSV в JSON. Производный набор данных распространяется на тех же условиях. Лицензия кода MIT не распространяется на набор данных; подробности — в [LICENSE-DATA.md](../LICENSE-DATA.md).
