// Мало Еднорогче — однесување на страниците.
// Компонентите (tc-*) доаѓаат од @toolcase/web-components; овде само ги
// регистрираме и им ги подаваме податоците што градачот ги остави во #page-data.
import { register } from '@toolcase/web-components'
import '@toolcase/web-components/style.css'
import './site.css'

register()

const data = (() => {
  const el = document.getElementById('page-data')
  try {
    return el ? JSON.parse(el.textContent) : {}
  } catch {
    return {}
  }
})()

// --- Навигација ------------------------------------------------------------
const nav = document.querySelector('tc-cool-nav')
if (nav) {
  if (Array.isArray(data.nav)) nav.items = data.nav
  // „Случајна приказна“ — копчето за најава на tc-cool-nav го користиме како CTA.
  nav.addEventListener('tc-login', () => {
    const list = Array.isArray(data.stories) ? data.stories : []
    if (!list.length) return
    const current = location.pathname.split('/').pop()
    const others = list.filter((href) => !href.endsWith(current)) 
    const pick = (others.length ? others : list)[Math.floor(Math.random() * (others.length || list.length))]
    location.href = pick
  })
}

// --- Херој (почетна) --------------------------------------------------------
const hero = document.querySelector('tc-hero')
if (hero && data.hero) {
  const h = data.hero
  if (h.primaryAction) hero.primaryAction = h.primaryAction
  if (h.secondaryAction) hero.secondaryAction = h.secondaryAction
  if (h.statCards) hero.statCards = h.statCards
  if (h.bgIcons) hero.bgIcons = h.bgIcons
}

// --- Подножје ---------------------------------------------------------------
const footer = document.querySelector('tc-page-footer')
if (footer && data.footer) {
  footer.menus = data.footer.menus || []
  footer.legalLinks = data.footer.legalLinks || []
  footer.socialLinks = data.footer.socialLinks || []
}

// --- Напредок на читањето (страници со приказна) ----------------------------
const progress = document.querySelector('tc-progress[data-reading]')
const body = document.querySelector('.story-body')
if (progress && body) {
  let raf = 0
  const update = () => {
    raf = 0
    const rect = body.getBoundingClientRect()
    const total = Math.max(body.offsetHeight - window.innerHeight * 0.6, 1)
    const read = Math.min(Math.max(-rect.top + window.innerHeight * 0.4, 0), total)
    const pct = Math.round((read / total) * 100)
    progress.setAttribute('value', String(pct))
    progress.value = pct
  }
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update)
  }
  update()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
}

// --- Поголеми букви (копчето „Аа“) ------------------------------------------
const KEY = 'me-golemi-bukvi'
const root = document.documentElement
const toggles = document.querySelectorAll('[data-toggle-letters]')
const apply = (on) => {
  root.classList.toggle('golemi-bukvi', on)
  toggles.forEach((b) => b.setAttribute('aria-pressed', on ? 'true' : 'false'))
}
try {
  apply(localStorage.getItem(KEY) === '1')
} catch {
  apply(false)
}
toggles.forEach((btn) => {
  btn.addEventListener('click', () => {
    const on = !root.classList.contains('golemi-bukvi')
    apply(on)
    try {
      localStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      /* приватен режим — само за оваа страница */
    }
  })
})
