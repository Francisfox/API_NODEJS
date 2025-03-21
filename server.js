import express from 'express';
import http from 'http';
import createGame from './game/game.js';
import socketio from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { Console } from 'console';

const app = express();
const server = http.createServer(app);
const sockets = socketio(server);

const filePathConected = './LOG/Conected.json';
const filePathDesconected = './LOG/Desconected.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedEmails = ['fsbrito@simpress.com.br','francismarfox@hotmail.com', 'ssilva@simpress.com.br', 'rogerc@simpress.com.br', 'rtakaku@simpress.com.br','bdsgoes@simpress.com.br','acmadeira@simpress.com.br'];

const authenticateEmail = (req, res, next) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).send('E-mail e senha são obrigatórios.');
    }

    if (!allowedEmails.includes(email) || senha !== 'Simpress') {
        return res.status(403).send('Acesso negado. E-mail ou senha incorretos.');
    }
    next();
};
const authenticateStatic = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    } else {
        res.redirect('/'); // Redireciona para a página de login se não autenticado
    }
};
app.use(session({
    secret: 'codigo',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  
app.use('/game', authenticateStatic, express.static(path.join(__dirname, 'game')));
app.get('/game', authenticateEmail, (req, res) => {
    res.sendFile(path.join(__dirname, 'game', 'index.html'));
});
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.static('public'));

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    console.log(email);
    console.log(senha);
    // Verifica se o e-mail está na lista de permitidos
    if (allowedEmails.includes(email) && senha === 'Simpress') {
        // Configurar a sessão do usuário como autenticada
        req.session.isAuthenticated = true;
        res.redirect('./game/index.html');
    } else {
        req.session.isAuthenticated = false;
        res.status(401).send('Email ou senha incorretos.');
    }
});
// Rota para servir o arquivo index.html da pasta game
app.get('/game', authenticateStatic, (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'index.html'));
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
//let cont = game.state.players // não achei a variavel que conta quantidades de login
game.subscribe((command) => {
    console.log(`> Emitting ${command.type}`)
    sockets.emit(command.type, command)
})

sockets.on('connection', (socket) => {
    const playerId = socket.id
    console.log(`> Player connected: ${playerId}`)
    console.log(game.observers.length)
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
