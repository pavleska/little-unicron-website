// Мало Еднорогче — мал сервер за папката dist/ (прво: npm run build)
const path = require('path')
const express = require('express')

const app = express()
const DIST = path.join(__dirname, 'dist')

app.use(express.static(DIST, { extensions: ['html'] }))
app.use((req, res) => {
  res.status(404).sendFile(path.join(DIST, '404.html'), (err) => {
    if (err) res.type('text/plain; charset=utf-8').send('Страницата не е пронајдена. Изврши „npm run build“.')
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Мало Еднорогче → http://localhost:${PORT}`))
