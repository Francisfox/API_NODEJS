const express = require('express');
const fs = require('fs');
const path = require('path'); // Necessário para lidar com caminhos de arquivo
const app = express();
const port = 3001;
// Middleware para processar JSON
app.use(express.json());
// Middleware para servir arquivos estáticos da pasta "public"
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para registrar acessos
app.post('/api/registro', (req, res) => {
    const { login, hora } = req.body;

    if (!login || !hora) {
        return res.status(400).json({ error: 'Login e hora são obrigatórios!' });
    }

    const registro = { login, hora };

    // Caminho para o arquivo na pasta "public"
    const filePath = path.join(__dirname, 'public', 'registros.txt');

    // Salva o registro no arquivo na pasta "public"
    fs.appendFile(filePath, JSON.stringify(registro) + '\n', (err) => {
        if (err) {
            console.error('Erro ao salvar registro:', err);
            return res.status(500).json({ error: 'Erro ao salvar registro.' });
        }

        //console.log('Registro salvo:', registro);
        res.status(201).json({ message: 'Registro salvo com sucesso!' });
    });
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
