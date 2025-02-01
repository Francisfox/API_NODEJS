import express from 'express'
import http from 'http'
import createGame from './public/game/game.js'
import socketio from 'socket.io'
import path from 'path'
import fs, { appendFile } from 'fs';

const app = express()
const server = http.createServer(app)
const sockets = socketio(server)

const filePathConected = './LOG/Conected.json';         // Local do arquivo JSON
const filePathDesconected = './LOG/Desconected.json';   // Local do arquivo JSON

// Lista de e-mails permitidos
const allowedEmails = ['fsbrito@simpress.com.br'];

// Middleware para definir cabeçalhos CORS manualmente
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite qualquer origem
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Métodos permitidos
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Cabeçalhos permitidos

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Finaliza requisições OPTIONS
    }

    next(); // Passa para a próxima função
});
app.use(express.static('public'))
// Rota de login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    // Verifica se o e-mail está na lista de permitidos
    if (!allowedEmails.includes(email)) {
        return res.status(403).send('Acesso negado. E-mail não autorizado.');
    }

    // Verifica se a senha está correta
    if (senha === 'Simpress') {
        // Redireciona para a página index.html dentro da pasta game
        res.redirect('/game/index.html');
    } else {
        res.status(401).send('Email ou senha incorretos.');
    }
});

app.get('/conected', (req, res) => {
    fs.readFile(filePathConected, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return res.status(500).json({ error: 'Erro ao ler o arquivo' });
        }

        try {
            // Tenta parsear o conteúdo JSON
            const registros = JSON.parse(data); // O arquivo deve conter um JSON válido
            res.json(registros); // Retorna o conteúdo como JSON
        } catch (parseErr) {
            console.error('Erro ao processar o conteúdo do arquivo:', parseErr);
            res.status(500).json({ error: 'Erro ao processar o conteúdo do arquivo' });
        }
    });
});
// retornar o JSON do aquivo Desconected pela URL/desconected ou http://localhost:3000/desconected
app.get('/desconected', (req, res) => {
    fs.readFile(filePathDesconected, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo:', err);
            return res.status(500).json({ error: 'Erro ao ler o arquivo' });
        }

        try {
            // Tenta parsear o conteúdo JSON
            const registros = JSON.parse(data); // O arquivo deve conter um JSON válido
            res.json(registros); // Retorna o conteúdo como JSON
        } catch (parseErr) {
            console.error('Erro ao processar o conteúdo do arquivo:', parseErr);
            res.status(500).json({ error: 'Erro ao processar o conteúdo do arquivo' });
        }
    });
});

const game = createGame()
game.start()

game.subscribe((command) => {
    console.log(`> Emitting ${command.type}`)
    sockets.emit(command.type, command)
})

sockets.on('connection', (socket) => {
    const playerId = socket.id
    console.log(`> Player connected: ${playerId}`)
    const connectionTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const registroConexao = {
        tipo: 'conexão',
        ID: playerId,
        horario: connectionTime,
    };
    // Lê o arquivo Conected.json para adicionar o novo registro
    fs.readFile(filePathConected, 'utf8', (err, data) => {
        let registros = [];

        if (!err && data) {
            try {
                registros = JSON.parse(data); // Carrega os registros existentes
            } catch (parseErr) {
                console.error('Erro ao processar o conteúdo do arquivo JSON:', parseErr);
            }
        }

        // Adiciona o novo registro
        registros.push(registroConexao);

        // Salva o novo conteúdo no arquivo
        fs.writeFile(filePathConected, JSON.stringify(registros, null, 4), (writeErr) => {
            if (writeErr) {
                console.error('Erro ao gravar no arquivo JSON:', writeErr);
            } else {
                console.log(`> Registro de Conexão adicionado para o ID ${playerId}`);
            }
        });
    });

    game.addPlayer({ playerId: playerId })
    socket.emit('setup', game.state)

    socket.on('disconnect', () => {
        game.removePlayer({ playerId: playerId })
        console.log(`> Player disconnected: ${playerId}`)
        const disconnectionTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const registroDesconexao = {
            tipo: 'desconexão',
            ID: playerId,
            horario: disconnectionTime,
        };
        // Lê o arquivo Conected.json para adicionar o novo registro
        fs.readFile(filePathDesconected, 'utf8', (err, data) => {
            let registros = [];

            if (!err && data) {
                try {
                    registros = JSON.parse(data); // Carrega os registros existentes
                } catch (parseErr) {
                    console.error('Erro ao processar o conteúdo do arquivo JSON:', parseErr);
                }
            }

            // Adiciona o novo registro
            registros.push(registroDesconexao);

            // Salva o novo conteúdo no arquivo
            fs.writeFile(filePathDesconected, JSON.stringify(registros, null, 4), (writeErr) => {
                if (writeErr) {
                    console.error('Erro ao gravar no arquivo JSON:', writeErr);
                } else {
                    console.log(`>> Registro de Desconexão adicionado para o ID ${playerId}`);
                }
            });
        });
    })

    socket.on('move-player', (command) => {
        command.playerId = playerId
        command.type = 'move-player'
        
        game.movePlayer(command)
    })
})

server.listen(3000, () => {
    console.log(`> Server listening on port: 3000`)
})
