export function setupScreen(canvas, game) {
    const { screen: {width, height} } = game.state
    canvas.width = width
    canvas.height = height
}

export default function renderScreen(screen, scoreTable, game, requestAnimationFrame, currentPlayerId) {
    const context = screen.getContext('2d')
    context.fillStyle = 'white'
    const { screen: {width, height} } = game.state
    context.clearRect(0, 0, width, height)

    for (const playerId in game.state.players) {
        const player = game.state.players[playerId]
        context.fillStyle = 'black'
        context.fillRect(player.x, player.y, 1, 1)
    }

    for (const fruitId in game.state.fruits) {
        const fruit = game.state.fruits[fruitId]
        context.fillStyle = 'green'
        context.fillRect(fruit.x, fruit.y, 1, 1)
    }

    const currentPlayer = game.state.players[currentPlayerId]

    if(currentPlayer) {
        context.fillStyle = '#F0DB4F'
        context.fillRect(currentPlayer.x, currentPlayer.y, 1, 1)
    }

    updateScoreTable(scoreTable, game, currentPlayerId)

    requestAnimationFrame(() => {
        renderScreen(screen, scoreTable, game, requestAnimationFrame, currentPlayerId)
    })
}

function updateScoreTable(scoreTable, game, currentPlayerId) {
    const maxResults = 10

    let scoreTableInnerHTML = `
        <tr class="header">
            <td>Top 10 Jogadores</td>
            <td>Pontos</td>
        </tr>
    `

    const playersArray = []

    for (let socketId in game.state.players) {
        const player = game.state.players[socketId]
        playersArray.push({
            playerId: socketId,
            x: player.x,
            y: player.y,
            score: player.score,
            email: player.email,
        })
    }
    
    const playersSortedByScore = playersArray.sort( (first, second) => {
        if (first.score < second.score) {
            return 1
        }

        if (first.score > second.score) {
            return -1
        }

        return 0
    })

    const topScorePlayers = playersSortedByScore.slice(0, maxResults)

    scoreTableInnerHTML = topScorePlayers.reduce((stringFormed, player) => {
        return stringFormed + `
            <tr ${player.playerId === currentPlayerId ? 'class="current-player"' : ''}>
                <td class="socket-id">${identificar(player)}</td>
                <td class="score-value">${player.score}</td>
            </tr>
        `
    }, scoreTableInnerHTML)

    // A linha do proprio jogador, repetida no rodape. Antes indexava o array
    // pelo id do socket (topScorePlayers[currentPlayerId]), o que dava sempre
    // undefined e a linha nunca aparecia - array se procura, nao se indexa
    // por chave.
    const currentPlayerFromTopScore =
        topScorePlayers.find(player => player.playerId === currentPlayerId)

    if (currentPlayerFromTopScore) {
        scoreTableInnerHTML += `
            <tr class="current-player footer">
                <td class="socket-id">${identificar(currentPlayerFromTopScore)} (voce)</td>
                <td class="score-value">${currentPlayerFromTopScore.score}</td>
            </tr>
        `
    }

    scoreTable.innerHTML = scoreTableInnerHTML
}

// Quem o jogador e na tabela: o e-mail do login. O id do socket fica como
// reserva - uma aba aberta sem sessao ainda precisa aparecer em algum lugar.
// Escapado porque vai para innerHTML.
function identificar(player) {
    const bruto = player.email || `anonimo (${String(player.playerId).slice(0, 6)})`

    return String(bruto).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
