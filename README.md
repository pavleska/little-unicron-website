# Мало Еднорогче

Веб-страница за деца што сакаат да читаат приказни за еднорози и бајки — на македонски.
Изградена со [`@toolcase/web-components`](https://www.npmjs.com/package/@toolcase/web-components)
(`tc-*` елементи, тема `sunshine / rose`).

## Стартување

```bash
npm install
npm start          # гради во dist/ и го крева серверот на http://localhost:3000
```

Само градење: `npm run build`. Само сервер (по градење): `npm run serve`.

## Како се додава приказна

Една приказна = една Markdown датотека во `content/prikazni/`. Пример:

```md
---
title: Ѕвездичка и изгубениот сјај
slug: zvezdichka-i-izgubeniot-sjaj
category: ednorozi            # ednorozi | bajki
icon: Sparkles                # lucide икона, PascalCase (Sparkles, Crown, Castle, Moon, ...)
accent: #c2417a               # боја на картичката и на првата буква
minutes: 5                    # ако го изоставиш, се пресметува од бројот на зборови
order: 1                      # редослед во полицата
origin: Оригинална приказна   # или: Браќа Грим, Ханс Кристијан Андерсен ...
summary: Една реченица што се гледа на картичката.
moral: Поуката што се прикажува на крајот од приказната.
---

Првиот пасус. Пасусите се одделуваат со празен ред.

Втор пасус. „Македонски наводници“ се пишуваат директно.

## Наслов на поглавје (по желба)

Уште текст.
```

Потоа `npm run build`. Страницата на приказната е `dist/prikazni/<slug>.html`,
а картичката се појавува на почетната во својата полица.

## Структура

```
content/prikazni/   приказните (изворот на вистината)
src/main.js         регистрација на компонентите + однесување (напредок, „Аа“, случајна приказна)
src/site.css        фонтови, токени и распоред врз темата
scripts/build.mjs   гради dist/ од content/ и src/
public/imgs/        илустрации (во dist/ се копираат само оние што се користат)
server.js           Express статичен сервер за dist/
```

Документацијата за `tc-*` елементите е во notegraph графот на проектот
(`notegraph read root`, па `notegraph search tc-hero --scope title`).
