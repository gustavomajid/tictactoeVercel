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
    const clientId = createId()
    clients[clientId] = { 'clientId': clientId, 'connection': connection }

    connection.on('close', () => {})
    connection.on('message', message => messageHandler(clientId, message))

    connection.send(JSON.stringify({ 'method': 'connect', 'clientId': clientId }))
    sendAvailableGames()
})

const configuredPort = Number(process.env.PORT)
const port = Number.isInteger(configuredPort) && configuredPort >= 0
    ? configuredPort
    : 8080

httpServer.listen(port, () => {
    console.log(`server listening on port ${httpServer.address().port}`)
})

function messageHandler(clientId, message) {
    const msg = parseMessage(clientId, message)
    if (!msg) {
        return
    }

    switch (msg.method) {
        case 'create': {
            const player = {
                'clientId': clientId,
                'symbol': CROSS_SYMBOL,
                'isTurn': true,
                'wins': 0,
                'lost': 0
            }
            const gameId = createId()
            games[gameId] = {
                'gameId': gameId,
                'players': [player],
                'board': createBoard(),
                'status': 'waiting',
                'winner': null
            }
            const payLoad = {
                'method': 'create',
                'game': games[gameId]
            }
            sendToClient(clientId, payLoad)
            sendAvailableGames()
            break
        }

        case 'join': {
            if (!Number.isInteger(msg.gameId)) {
                sendError(clientId, 'invalidGame')
                break
            }

            const game = games[msg.gameId]
            const isAlreadyPlayer = game && game.players.some(player => (
                player.clientId === clientId
            ))

            if (!game || game.status !== 'waiting' || isAlreadyPlayer) {
                sendError(clientId, 'gameUnavailable')
                break
            }

            game.players.push({
                'clientId': clientId,
                'symbol': CIRCLE_SYMBOL,
                'isTurn': false,
                'wins': 0,
                'lost': 0
            })
            game.status = 'active'

            sendToClient(clientId, {
                'method': 'join',
                'game': game
            })

            broadcastGame(game)
            sendAvailableGames()
            break
        }

        case 'makeMove': {
            if (!Number.isInteger(msg.gameId)) {
                sendError(clientId, 'invalidGame')
                break
            }

            const game = games[msg.gameId]
            if (!game) {
                sendError(clientId, 'invalidGame')
                break
            }

            if (game.status === 'finished') {
                sendError(clientId, 'gameFinished')
                break
            }

            if (game.status !== 'active' || game.players.length !== 2) {
                sendError(clientId, 'gameUnavailable')
                break
            }

            const currentPlayer = game.players.find(player => player.isTurn)
            const ownsTurn = currentPlayer && currentPlayer.clientId === clientId
            if (!ownsTurn) {
                sendError(clientId, 'notYourTurn')
                break
            }

            if (!isValidMove(game.board, msg.cellIndex)) {
                sendError(clientId, 'invalidMove')
                break
            }

            game.board = applyMove(game.board, msg.cellIndex, currentPlayer.symbol)
            const winner = getWinner(game.board)

            if (winner) {
                finishGame(game, winner)
                broadcastGame(game)
                broadcast(game, { 'method': 'gameEnds', 'winner': winner })
                break
            }

            if (isDraw(game.board)) {
                finishGame(game, null)
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

        default:
            sendError(clientId, 'unknownMethod')
    }
}

function parseMessage(clientId, message) {
    if (!message || message.type !== 'utf8' || typeof message.utf8Data !== 'string') {
        sendError(clientId, 'invalidMessage')
        return null
    }

    let msg
    try {
        msg = JSON.parse(message.utf8Data)
    } catch {
        sendError(clientId, 'invalidJson')
        return null
    }

    if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.method !== 'string') {
        sendError(clientId, 'invalidMessage')
        return null
    }

    return msg
}

function finishGame(game, winner) {
    game.status = 'finished'
    game.winner = winner
    game.players.forEach(player => {
        player.isTurn = false
    })
}

function broadcastGame(game) {
    broadcast(game, {
        'method': 'updateBoard',
        'game': game
    })
}

function broadcast(game, payLoad) {
    game.players.forEach(player => {
        sendToClient(player.clientId, payLoad)
    })
}

function sendAvailableGames() {
    const availableGames = Object.values(games)
        .filter(game => game.status === 'waiting')
        .map(game => game.gameId)
    const payLoad = { 'method': 'gamesAvail', 'games': availableGames }

    Object.values(clients).forEach(client => {
        sendToClient(client.clientId, payLoad)
    })
}

function sendError(clientId, code) {
    sendToClient(clientId, { 'method': 'error', 'code': code })
}

function sendToClient(clientId, payLoad) {
    const client = clients[clientId]
    if (client && client.connection.connected) {
        client.connection.send(JSON.stringify(payLoad))
    }
}

function createId() {
    let id
    do {
        id = Math.floor(Math.random() * 1_000_000)
    } while (clients[id] || games[id])
    return id
}
