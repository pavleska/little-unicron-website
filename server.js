const express = require('express')

const app = express()

app.use(express.static('./'))

const PORT = 3000

app.listen(PORT, () => console.log(`Web server started on \n http://localhost:${PORT}`))