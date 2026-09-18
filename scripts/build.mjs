#!/usr/bin/env node
// Гради го сајтот „Мало Еднорогче“: content/prikazni/*.md → dist/
//
//   npm run build      →  dist/index.html, dist/za-nas.html, dist/prikazni/<slug>.html,
//                          dist/assets/app.{js,css}, dist/imgs/*
//
// Излезната папка може да се смени со аргумент или OUT_DIR:
//   node scripts/build.mjs output   или   OUT_DIR=output npm run build
//
// Секоја приказна е Markdown датотека со frontmatter (види README.md).
import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build as bundle } from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = path.join(ROOT, 'content', 'prikazni')
const OUT = process.argv[2] || process.env.OUT_DIR || 'dist'
const DIST = path.resolve(ROOT, OUT)
const IMAGES = ['unicorn_on_clouds.png', 'books_unicorn_left.png', 'main_unicorn.png', 'little_unicorn.jpg']

const SITE = {
  name: 'Мало Еднорогче',
  tagline: 'Приказни за еднорози и бајки за деца, на македонски',
  description:
    'Волшебни приказни за еднорози и најомилените бајки, напишани едноставно и топло — за читање пред спиење, на глас или сами.',
  year: new Date().getFullYear(),
}

const CATEGORIES = {
  ednorozi: {
    slug: 'ednorozi',
    label: 'Приказни за еднорози',
    short: 'Еднорози',
    subtitle: 'Оригинални приказни за храброст, пријателство и малку волшебство',
  },
  bajki: {
    slug: 'bajki',
    label: 'Бајки',
    short: 'Бајки',
    subtitle: 'Најомилените бајки од целиот свет, нежно прераскажани за најмалите',
  },
}

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s = '') => esc(s).replace(/"/g, '&quot;')
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c')

// ---------------------------------------------------------------------------
// Содржина
// ---------------------------------------------------------------------------
function parseStory(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) throw new Error(`${file}: недостига frontmatter (--- ... ---)`)
  const meta = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    meta[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1')
  }
  for (const key of ['title', 'slug', 'category', 'summary', 'moral']) {
    if (!meta[key]) throw new Error(`${file}: недостига полето „${key}“`)
  }
  if (!CATEGORIES[meta.category]) throw new Error(`${file}: непозната категорија „${meta.category}“`)

  const body = m[2].trim()
  const blocks = body
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const html = blocks
    .map((b) =>
      b.startsWith('## ')
        ? `<h2>${esc(b.slice(3).trim())}</h2>`
        : `<p>${esc(b).replace(/\s*\r?\n\s*/g, ' ')}</p>`,
    )
    .join('\n')
  const words = body.split(/\s+/).filter(Boolean).length
  return {
    ...meta,
    icon: meta.icon || 'Sparkles',
    accent: meta.accent || '#c2417a',
    origin: meta.origin || (meta.category === 'ednorozi' ? 'Оригинална приказна' : 'Народна бајка'),
    minutes: Number(meta.minutes) || Math.max(2, Math.round(words / 120)),
    order: Number(meta.order) || 99,
    words,
    html,
    href: `prikazni/${meta.slug}.html`,
  }
}

async function loadStories() {
  const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.md')).sort()
  const stories = []
  for (const f of files) stories.push(parseStory(await readFile(path.join(CONTENT, f), 'utf8'), f))
  const catOrder = Object.keys(CATEGORIES)
  stories.sort(
    (a, b) =>
      catOrder.indexOf(a.category) - catOrder.indexOf(b.category) ||
      a.order - b.order ||
      a.title.localeCompare(b.title, 'mk'),
  )
  const seen = new Set()
  for (const s of stories) {
    if (seen.has(s.slug)) throw new Error(`Двојно slug: ${s.slug}`)
    seen.add(s.slug)
  }
  return stories
}

// ---------------------------------------------------------------------------
// Заеднички делови
// ---------------------------------------------------------------------------
function navItems(rel, active) {
  return [
    { label: 'Почетна', href: `${rel}index.html`, active: active === 'home' },
    { label: CATEGORIES.ednorozi.short, href: `${rel}index.html#ednorozi`, active: active === 'ednorozi' },
    { label: CATEGORIES.bajki.short, href: `${rel}index.html#bajki`, active: active === 'bajki' },
    { label: 'За нас', href: `${rel}za-nas.html`, active: active === 'about' },
  ]
}

function navHtml(rel) {
  return `<tc-cool-nav sticky expand-breakpoint="md" login-label="Случајна приказна" login-variant="primary" scroll-offset="24">
  <a slot="brand" class="me-brand" href="${rel}index.html" aria-label="${attr(SITE.name)} — почетна">
    <img src="${rel}imgs/main_unicorn.png" alt="" width="40" height="40">
    <tc-brand primary-text="Мало" secondary-text="Еднорогче"></tc-brand>
  </a>
  <tc-button slot="right" variant="secondary" outline size="sm" data-toggle-letters aria-pressed="false" title="Поголеми букви за полесно читање">Аа</tc-button>
</tc-cool-nav>`
}

function footerData(rel, stories) {
  const links = (cat) =>
    stories.filter((s) => s.category === cat).map((s) => ({ label: s.title, href: `${rel}${s.href}` }))
  return {
    menus: [
      { title: CATEGORIES.ednorozi.label, links: links('ednorozi') },
      { title: CATEGORIES.bajki.label, links: links('bajki').slice(0, 6) },
      {
        title: 'Инфо',
        links: [
          { label: 'За нас', href: `${rel}za-nas.html` },
          { label: 'Како да читаме заедно', href: `${rel}index.html#zaedno` },
          { label: 'Сите бајки', href: `${rel}index.html#bajki` },
        ],
      },
    ],
    legalLinks: [
      { label: 'За нас', href: `${rel}za-nas.html` },
      { label: 'Почетна', href: `${rel}index.html` },
    ],
    socialLinks: [],
  }
}

function footerHtml() {
  return `<tc-page-footer
  brand="${attr(SITE.name)}"
  tagline="${attr(SITE.tagline)}"
  description="Бајките се народни приказни, слободно прераскажани за деца. Приказните за еднорози се оригинални и напишани за оваа страница."
  legal-text="© ${SITE.year} ${attr(SITE.name)} · Направено со љубов за малите читатели"
></tc-page-footer>`
}

function layout({ title, description, rel, page, active, body, data, stories }) {
  const pageData = {
    nav: navItems(rel, active),
    stories: stories.map((s) => `${rel}${s.href}`),
    footer: footerData(rel, stories),
    ...data,
  }
  return `<!DOCTYPE html>
<html lang="mk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(description)}">
  <meta name="author" content="Мало Еднорогче">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="mk_MK">
  <meta name="theme-color" content="#fff9f2">
  <link rel="icon" type="image/png" href="${rel}imgs/main_unicorn.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@500;700&family=Nunito:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${rel}assets/app.css">
  <script type="module" src="${rel}assets/app.js"></script>
</head>
<body data-page="${page}">
<tc-theme name="sunshine" variant="rose">
${navHtml(rel)}
<main id="glavno">
${body}
</main>
${footerHtml()}
</tc-theme>
<script type="application/json" id="page-data">${json(pageData)}</script>
</body>
</html>
`
}

function cardHtml(s, rel) {
  const cat = CATEGORIES[s.category]
  return `<tc-taxonomy-card
  accent="${attr(s.accent)}"
  eyebrow="${attr(cat.label)}"
  heading="${attr(s.title)}"
  heading-level="3"
  subheading="${attr(s.origin)}"
  description="${attr(s.summary)}"
  clamp="3"
  metric-value="${s.minutes}"
  metric-unit="мин"
  metric-spoken="${s.minutes} минути читање"
  href="${rel}${s.href}"
>
  <div slot="media" class="me-card-media" style="--me-accent:${attr(s.accent)}"><tc-icon name="${attr(s.icon)}" size="2.4rem" decorative></tc-icon></div>
</tc-taxonomy-card>`
}

function grid(list, rel, cols = { sm: 2, lg: 3 }) {
  return `<tc-grid columns="1" columns-sm="${cols.sm}" columns-lg="${cols.lg}" gap="1.25rem">
${list.map((s) => cardHtml(s, rel)).join('\n')}
</tc-grid>`
}

const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)

// ---------------------------------------------------------------------------
// Страници
// ---------------------------------------------------------------------------
function homePage(stories) {
  const rel = ''
  const ednorozi = stories.filter((s) => s.category === 'ednorozi')
  const bajki = stories.filter((s) => s.category === 'bajki')
  const daily = stories[dayOfYear() % stories.length]
  const minutes = stories.reduce((n, s) => n + s.minutes, 0)

  const body = `<tc-hero
  id="hero"
  eyebrow="Приказни за деца на македонски"
  title="Добредојде во светот на Малото Еднорогче"
  title-as="h1"
  description="${attr(SITE.description)}"
  note="Бесплатно · Без реклами · За деца од 3 до 9 години и за оние што им читаат"
  media-src="${rel}imgs/unicorn_on_clouds.png"
  media-alt="Мало еднорогче седи на облак меѓу ѕвезди"
  media-label="Приказна на денот"
  media-caption="${attr(daily.title)}"
  backdrop="grid"
></tc-hero>

<section id="ednorozi" class="me-section">
  <tc-container>
    <div class="me-section-head">
      <tc-section-flag title="${attr(CATEGORIES.ednorozi.label)}" subtitle="${attr(CATEGORIES.ednorozi.subtitle)}"></tc-section-flag>
      <tc-badge pill tone="neutral" text="${ednorozi.length} приказни"></tc-badge>
    </div>
    ${grid(ednorozi, rel)}
  </tc-container>
</section>

<section id="bajki" class="me-section me-section--alt">
  <tc-container>
    <div class="me-section-head me-section-head--art">
      <tc-section-flag title="${attr(CATEGORIES.bajki.label)}" subtitle="${attr(CATEGORIES.bajki.subtitle)}"></tc-section-flag>
      <img class="me-section-art" src="${rel}imgs/books_unicorn_left.png" alt="Еднорог чита книга седнат на полица со книги" width="280" height="170" loading="lazy">
    </div>
    ${grid(bajki, rel)}
  </tc-container>
</section>

<section id="zaedno" class="me-section">
  <tc-container>
    <tc-section-flag title="Како да читаме заедно" subtitle="Три мали идеи за родители, баби и дедовци" align="center"></tc-section-flag>
    <tc-grid columns="1" columns-md="3" gap="1.25rem">
      <tc-feature-card icon="Volume2" eyebrow="Пред спиење" title="Читајте гласно" description="Менувајте гласови за јунаците и застанувајте пред возбудливите делови. Децата ги паметат приказните што ги слушнале со насмевка."></tc-feature-card>
      <tc-feature-card icon="MessageCircleHeart" eyebrow="По приказната" title="Прашајте за поуката" description="Секоја приказна завршува со кратка поука. Прашајте: „А ти што би направил на негово место?“"></tc-feature-card>
      <tc-feature-card icon="Palette" eyebrow="Следниот ден" title="Нацртајте го јунакот" description="Еднорог, замок или куќичка од тули: цртањето ја продолжува приказната и утредента."></tc-feature-card>
    </tc-grid>
  </tc-container>
</section>`

  return layout({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    rel,
    page: 'home',
    active: 'home',
    body,
    stories,
    data: {
      hero: {
        primaryAction: { label: 'Прочитај ја приказната на денот', href: `${rel}${daily.href}`, icon: 'BookOpen' },
        secondaryAction: { label: 'Сите приказни', href: '#ednorozi', icon: 'Sparkles' },
        statCards: [
          { label: 'Приказни за еднорози', value: String(ednorozi.length) },
          { label: 'Бајки', value: String(bajki.length) },
          { label: 'Минути читање', value: `${minutes}+` },
        ],
        bgIcons: ['Star', 'Sparkles', 'Moon', 'Cloud', 'Heart', 'Rainbow', 'Crown', 'Castle'],
      },
    },
  })
}

function storyPage(s, i, stories) {
  const rel = '../'
  const cat = CATEGORIES[s.category]
  const prev = stories[(i - 1 + stories.length) % stories.length]
  const next = stories[(i + 1) % stories.length]
  const more = stories
    .filter((x) => x.slug !== s.slug)
    .sort((a, b) => (a.category === s.category ? -1 : 1) - (b.category === s.category ? -1 : 1))
    .slice(0, 3)

  const body = `<tc-progress class="me-reading-progress" data-reading value="0" max="100" variant="primary" aria-label="Напредок на читањето"></tc-progress>
<article class="me-story" id="prikazna">
  <tc-container size="md">
    <tc-breadcrumb>
      <tc-breadcrumb-item href="${rel}index.html">Почетна</tc-breadcrumb-item>
      <tc-breadcrumb-item href="${rel}index.html#${cat.slug}">${esc(cat.label)}</tc-breadcrumb-item>
      <tc-breadcrumb-item active>${esc(s.title)}</tc-breadcrumb-item>
    </tc-breadcrumb>

    <header class="me-story-head" style="--me-accent:${attr(s.accent)}">
      <div class="me-story-icon"><tc-icon name="${attr(s.icon)}" size="2.4rem" decorative></tc-icon></div>
      <div class="me-story-chips">
        <tc-badge size="xs" pill tone="neutral" text="${attr(cat.label)}"></tc-badge>
        <tc-badge size="xs" pill tone="neutral" text="${s.minutes} мин читање"></tc-badge>
        <tc-badge size="xs" pill tone="neutral" text="${attr(s.origin)}"></tc-badge>
      </div>
      <tc-heading as="h1">${esc(s.title)}</tc-heading>
      <tc-text as="p" size="large" variant="muted">${esc(s.summary)}</tc-text>
    </header>

    <tc-divider></tc-divider>

    <div class="story-body" style="--me-accent:${attr(s.accent)}">
${s.html}
    </div>

    <tc-callout-quote quote="${attr(s.moral)}" attribution="Поука од приказната"></tc-callout-quote>

    <tc-divider label="Продолжи со читање"></tc-divider>

    <nav class="me-story-nav" aria-label="Претходна и следна приказна">
      <tc-button href="${rel}${prev.href}" variant="secondary" outline>← ${esc(prev.title)}</tc-button>
      <tc-button href="${rel}${next.href}" variant="primary">${esc(next.title)} →</tc-button>
    </nav>
  </tc-container>

  <section class="me-section me-section--alt">
    <tc-container>
      <tc-section-flag title="Уште приказни" subtitle="Ако ти се допадна оваа, пробај ги и овие"></tc-section-flag>
      ${grid(more, rel)}
    </tc-container>
  </section>
</article>`

  return layout({
    title: `${s.title} — ${cat.label} · ${SITE.name}`,
    description: s.summary,
    rel,
    page: 'story',
    active: s.category,
    body,
    stories,
    data: {},
  })
}

function aboutPage(stories) {
  const rel = ''
  const body = `<tc-rich-page-header
  icon-name="Sparkles"
  icon-color="pink"
  title-text="За Малото Еднорогче"
  sub="Место каде приказните се читаат на македонски, без брзање и без реклами"
  description="Страница за деца што сакаат еднорози, бајки и топли приказни пред спиење — и за возрасните што им читаат."
>
  <tc-badge slot="chips" size="xs" pill tone="neutral" text="Бесплатно"></tc-badge>
  <tc-badge slot="chips" size="xs" pill tone="neutral" text="${stories.length} приказни"></tc-badge>
  <tc-button slot="actions" variant="primary" href="${rel}index.html#ednorozi">Кон приказните</tc-button>
</tc-rich-page-header>

<tc-container size="md">
  <div class="me-prose">
    <h2>Што има тука?</h2>
    <p>Две полици со приказни. На првата се <strong>приказните за еднорози</strong> — оригинални, напишани за оваа страница, за храброст, пријателство и малку волшебство. На втората се <strong>бајките</strong> што ги знаат децата од целиот свет: Пепелашка, Црвенкапа, Снежана, Трите прасиња и другите, нежно прераскажани за најмалите, без страшни делови што ќе ги држат будни.</p>
    <p>Секоја приказна е напишана за околу пет минути читање и завршува со кратка <strong>поука</strong> — една реченица за разговор по читањето.</p>

    <h2>За родителите</h2>
    <ul>
      <li><strong>Копчето „Аа“</strong> во горниот десен агол ги зголемува буквите — за деца што учат да читаат сами.</li>
      <li><strong>Тенката линија</strong> на врвот од секоја приказна покажува колку е прочитано — децата сакаат да ја гледаат како расте.</li>
      <li><strong>„Случајна приказна“</strong> избира една наслепо, кога никој не може да се одлучи.</li>
    </ul>

    <h2>Од каде се бајките?</h2>
    <p>Бајките се народни приказни, запишани пред многу години од Браќата Грим, Шарл Перо и Ханс Кристијан Андерсен. Тие се дел од заедничкото наследство на сите деца, а тука се прераскажани со наши зборови. Приказните за еднорози се оригинални и напишани за Малото Еднорогче.</p>

    <h2>Како се додава нова приказна?</h2>
    <p>Страницата се гради од обични текстуални датотеки. Една приказна е една датотека во папката <code>content/prikazni/</code>, со наслов, категорија и поука на почетокот и обичен текст по неа. Потоа <code>npm run build</code> — и приказната е на полицата. Деталите се во <code>README.md</code>.</p>
  </div>
</tc-container>

<section class="me-section me-section--alt">
  <tc-container>
    <tc-section-flag title="Започни од овде" subtitle="Три приказни за прво читање"></tc-section-flag>
    ${grid(stories.filter((s) => s.order === 1).slice(0, 3).concat(stories.filter((s) => s.order !== 1)).slice(0, 3), rel)}
  </tc-container>
</section>`

  return layout({
    title: `За нас · ${SITE.name}`,
    description: 'Кој стои зад Малото Еднорогче, од каде се приказните и како се додава нова.',
    rel,
    page: 'about',
    active: 'about',
    body,
    stories,
    data: {},
  })
}

function notFoundPage(stories) {
  const rel = '/'
  const body = `<tc-container>
  <div class="me-404">
    <tc-empty-state icon="Cloud" heading="Оваа страница одлета на облак" description="Не постои страница со оваа адреса. Можеби приказната е преместена, или адресата е погрешно напишана."></tc-empty-state>
    <tc-button href="${rel}index.html" variant="primary">Назад на почетната</tc-button>
  </div>
</tc-container>`
  return layout({
    title: `Страницата не е пронајдена · ${SITE.name}`,
    description: 'Страницата не е пронајдена.',
    rel,
    page: '404',
    active: '',
    body,
    stories,
    data: {},
  })
}

// ---------------------------------------------------------------------------
// Градење
// ---------------------------------------------------------------------------
async function main() {
  const t0 = Date.now()
  const stories = await loadStories()
  if (!stories.length) throw new Error('Нема приказни во content/prikazni/')

  await rm(DIST, { recursive: true, force: true })
  await mkdir(path.join(DIST, 'prikazni'), { recursive: true })
  await mkdir(path.join(DIST, 'imgs'), { recursive: true })
  await mkdir(path.join(DIST, 'assets'), { recursive: true })

  await writeFile(path.join(DIST, 'index.html'), homePage(stories))
  await writeFile(path.join(DIST, 'za-nas.html'), aboutPage(stories))
  await writeFile(path.join(DIST, '404.html'), notFoundPage(stories))
  for (const [i, s] of stories.entries()) {
    await writeFile(path.join(DIST, s.href), storyPage(s, i, stories))
  }
  for (const img of IMAGES) {
    await copyFile(path.join(ROOT, 'public', 'imgs', img), path.join(DIST, 'imgs', img))
  }

  await bundle({
    entryPoints: [path.join(ROOT, 'src', 'main.js')],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2020'],
    outdir: path.join(DIST, 'assets'),
    entryNames: 'app',
    loader: { '.svg': 'dataurl', '.png': 'file', '.woff': 'file', '.woff2': 'file', '.ttf': 'file' },
    logLevel: 'warning',
  })

  const words = stories.reduce((n, s) => n + s.words, 0)
  console.log(
    `✔ ${stories.length} приказни (${words} зборови), ${stories.length + 3} страници → ${OUT}/ за ${Date.now() - t0} ms`,
  )
}

main().catch((err) => {
  console.error('✘ Градењето не успеа:', err.message)
  process.exit(1)
})
