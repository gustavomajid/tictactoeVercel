const http = require('http')
const WebSocket = require('websocket').server
const {
    applyMove,
    createBoard,
    getWinner,
    isDraw,
    isValidMove
} = require('./gameRules')

const games = {}
const clients = {}
const CROSS_SYMBOL = 'x'
const CIRCLE_SYMBOL = 'o'

const httpServer = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end('Tic Tac Toe WebSocket server')
})

const socketServer = new WebSocket({
    'httpServer': httpServer
})

socketServer.on('request', request => {
    const connection = request.accept(null, request.origin)
    connection.on('close', () => {})
    connection.on('message', messageHandler)

    const clientId = createId()
    clients[clientId] = { 'clientId': clientId, 'connection': connection }
    connection.send(JSON.stringify({ 'method': 'connect', 'clientId': clientId }))
    sendAvailableGames()
})

httpServer.listen(8080, () => {
    console.log('server listening on port 8080')
})

function messageHandler(message) {
    const msg = JSON.parse(message.utf8Data)

    switch (msg.method) {
        case 'create': {
            const player = {
                'clientId': msg.clientId,
                'symbol': CROSS_SYMBOL,
                'isTurn': true,
                'wins': 0,
                'lost': 0
            }
            const gameId = createId()
            games[gameId] = {
                'gameId': gameId,
                'players': [player],
                'board': createBoard()
            }
            const payLoad = {
                'method': 'create',
                'game': games[gameId]
            }
            clients[msg.clientId].connection.send(JSON.stringify(payLoad))
            sendAvailableGames()
            break
        }

        case 'join': {
            const game = games[msg.gameId]
            if (!game || game.players.length >= 2 || !clients[msg.clientId]) {
                break
            }

            game.players.push({
                'clientId': msg.clientId,
                'symbol': CIRCLE_SYMBOL,
                'isTurn': false,
                'wins': 0,
                'lost': 0
            })

            clients[msg.clientId].connection.send(JSON.stringify({
                'method': 'join',
                'game': game
            }))

            broadcastGame(game)
            sendAvailableGames()
            break
        }

        case 'makeMove': {
            const game = games[msg.gameId]
            if (!game || game.players.length !== 2) {
                break
            }

            const currentPlayer = game.players.find(player => player.isTurn)
            const ownsTurn = currentPlayer && currentPlayer.clientId === msg.clientId
            if (!ownsTurn || !isValidMove(game.board, msg.cellIndex)) {
                break
            }

            game.board = applyMove(game.board, msg.cellIndex, currentPlayer.symbol)
            const winner = getWinner(game.board)

            if (winner) {
                broadcastGame(game)
                broadcast(game, { 'method': 'gameEnds', 'winner': winner })
                break
            }

            if (isDraw(game.board)) {
                broadcastGame(game)
                broadcast(game, { 'method': 'draw' })
                break
            }

            game.players.forEach(player => {
                player.isTurn = !player.isTurn
            })
            broadcastGame(game)
            break
        }
    }
}

function broadcastGame(game) {
    broadcast(game, {
        'method': 'updateBoard',
        'game': game
    })
}

function broadcast(game, payLoad) {
    game.players.forEach(player => {
        clients[player.clientId].connection.send(JSON.stringify(payLoad))
    })
}

function sendAvailableGames() {
    const availableGames = Object.values(games)
        .filter(game => game.players.length < 2)
        .map(game => game.gameId)
    const payLoad = { 'method': 'gamesAvail', 'games': availableGames }

    Object.values(clients).forEach(client => {
        client.connection.send(JSON.stringify(payLoad))
    })
}

function createId() {
    let id
    do {
        id = Math.floor(Math.random() * 1_000_000)
    } while (clients[id] || games[id])
    return id
}
