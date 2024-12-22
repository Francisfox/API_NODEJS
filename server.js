const express = require('express');
const path = require('path'); // Necessário para lidar com caminhos de arquivo
const app = express();
const port = 3001;

// Middleware para servir arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
