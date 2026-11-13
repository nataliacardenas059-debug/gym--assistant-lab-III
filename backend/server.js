
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const conectarBaseDeDatos = require('./src/configurations/database');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        mensaje: 'Bienvenido a Gym Assistant API',
        estado: 'Servidor funcionando'
    });
});

async function iniciar() {
    await conectarBaseDeDatos();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Servidor listo en http://localhost:${PORT}`);
    });
}

iniciar();
