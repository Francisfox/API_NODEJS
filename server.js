const express = require('express');
const app = express();
const port = 3001;

// Middleware para servir arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
    res.send('<h1>Bem-vindo ao Node.js!</h1><p>Esta é uma página simples.</p>');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
