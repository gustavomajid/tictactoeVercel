const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const WebSocketClient = require('websocket').client

const projectRoot = path.resolve(__dirname, '..')
const messageTimeout = 5000

function startServer(t) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['webServer.js'], {
            'cwd': projectRoot,
            'env': { ...process.env, 'PORT': '0' },
            'stdio': ['ignore', 'pipe', 'pipe']
        })
        let output = ''
        let errorOutput = ''
        let started = false

        const timer = setTimeout(() => {
            if (child.exitCode === null) {
                child.kill()
            }
            reject(new Error(`Server start timed out: ${errorOutput}`))
        }, messageTimeout)

        child.stderr.on('data', chunk => {
            errorOutput += chunk.toString()
        })

        child.stdout.on('data', chunk => {
            output += chunk.toString()
            const match = output.match(/server listening on port (\d+)/)
            if (!match || started) {
                return
            }

            started = true
            clearTimeout(timer)
            t.after(async () => {
                if (child.exitCode === null) {
                    child.kill()
                    await once(child, 'exit')
                }
            })
            resolve({
                'child': child,
                'port': Number(match[1]),
                'getErrorOutput': () => errorOutput
            })
        })

        child.once('error', error => {
            clearTimeout(timer)
            reject(error)
        })

        child.once('exit', code => {
            if (!started) {
                clearTimeout(timer)
                reject(new Error(`Server exited with code ${code}: ${errorOutput}`))
            }
        })
    })
}

async function connectPlayer(t, port) {
    const client = new WebSocketClient()
    const messages = []
    const waiters = []

    function handleMessage(rawMessage) {
        if (rawMessage.type !== 'utf8') {
            return
        }

        const message = JSON.parse(rawMessage.utf8Data)
        messages.push(message)

        for (const waiter of [...waiters]) {
            const index = messages.findIndex(waiter.predicate)
            if (index === -1) {
                continue
            }

            const [matchingMessage] = messages.splice(index, 1)
            clearTimeout(waiter.timer)
            waiters.splice(waiters.indexOf(waiter), 1)
            waiter.resolve(matchingMessage)
        }
    }

    const connection = await new Promise((resolve, reject) => {
        client.once('connectFailed', reject)
        client.once('connect', connected => {
            connected.on('message', handleMessage)
            resolve(connected)
        })
        client.connect(`ws://127.0.0.1:${port}`)
    })

    t.after(() => {
        if (connection.connected) {
            connection.close()
        }
    })

    function waitFor(predicate, label) {
        const index = messages.findIndex(predicate)
        if (index !== -1) {
            return Promise.resolve(messages.splice(index, 1)[0])
        }

        return new Promise((resolve, reject) => {
            const waiter = { 'predicate': predicate, 'resolve': resolve }
            waiter.timer = setTimeout(() => {
                const waiterIndex = waiters.indexOf(waiter)
                if (waiterIndex !== -1) {
                    waiters.splice(waiterIndex, 1)
                }
                reject(new Error(`Timed out waiting for ${label}`))
            }, messageTimeout)
            waiters.push(waiter)
        })
    }

    const connectMessage = await waitFor(
        message => message.method === 'connect',
        'connect message'
    )

    return {
        'clientId': connectMessage.clientId,
        'connection': connection,
        'send': payLoad => connection.sendUTF(JSON.stringify(payLoad)),
        'sendRaw': value => connection.sendUTF(value),
        'waitFor': waitFor
    }
}

async function startGame(t) {
    const server = await startServer(t)
    const firstPlayer = await connectPlayer(t, server.port)
    const secondPlayer = await connectPlayer(t, server.port)

    firstPlayer.send({ 'method': 'create' })
    const createMessage = await firstPlayer.waitFor(
        message => message.method === 'create',
        'created game'
    )
    const gameId = createMessage.game.gameId

    secondPlayer.send({ 'method': 'join', 'gameId': gameId })
    await secondPlayer.waitFor(
        message => message.method === 'join',
        'joined game'
    )
    await firstPlayer.waitFor(
        message => message.method === 'updateBoard' && message.game.status === 'active',
        'active game'
    )

    return { server, firstPlayer, secondPlayer, gameId }
}

async function playMove(player, observer, gameId, cellIndex, symbol) {
    player.send({ 'method': 'makeMove', 'gameId': gameId, 'cellIndex': cellIndex })
    return observer.waitFor(
        message => message.method === 'updateBoard'
            && message.game.board[cellIndex] === symbol,
        `move ${symbol} at ${cellIndex}`
    )
}

test('binds move authorization to the WebSocket connection', async t => {
    const { server, firstPlayer, gameId } = await startGame(t)
    const attacker = await connectPlayer(t, server.port)

    attacker.send({
        'method': 'makeMove',
        'gameId': gameId,
        'clientId': firstPlayer.clientId,
        'cellIndex': 0
    })

    const error = await attacker.waitFor(
        message => message.method === 'error',
        'authorization error'
    )
    assert.equal(error.code, 'notYourTurn')

    const update = await playMove(firstPlayer, firstPlayer, gameId, 0, 'x')
    assert.equal(update.game.board[0], 'x')
})

test('rejects moves after the game reaches a terminal state', async t => {
    const { firstPlayer, secondPlayer, gameId } = await startGame(t)

    await playMove(firstPlayer, firstPlayer, gameId, 0, 'x')
    await playMove(secondPlayer, firstPlayer, gameId, 3, 'o')
    await playMove(firstPlayer, firstPlayer, gameId, 1, 'x')
    await playMove(secondPlayer, firstPlayer, gameId, 4, 'o')
    const finalUpdate = await playMove(firstPlayer, firstPlayer, gameId, 2, 'x')
    const gameEnds = await firstPlayer.waitFor(
        message => message.method === 'gameEnds',
        'game end'
    )

    assert.equal(gameEnds.winner, 'x')
    assert.equal(finalUpdate.game.status, 'finished')
    assert.equal(finalUpdate.game.winner, 'x')
    assert.equal(finalUpdate.game.players.every(player => !player.isTurn), true)

    firstPlayer.send({ 'method': 'makeMove', 'gameId': gameId, 'cellIndex': 5 })
    const error = await firstPlayer.waitFor(
        message => message.method === 'error',
        'finished-game error'
    )
    assert.equal(error.code, 'gameFinished')
})

test('rejects malformed JSON without terminating the server', async t => {
    const server = await startServer(t)
    const player = await connectPlayer(t, server.port)

    player.sendRaw('{invalid-json')
    const error = await player.waitFor(
        message => message.method === 'error',
        'invalid JSON error'
    )

    assert.equal(error.code, 'invalidJson')
    assert.equal(server.child.exitCode, null, server.getErrorOutput())

    player.send({ 'method': 'create' })
    const createMessage = await player.waitFor(
        message => message.method === 'create',
        'created game after invalid JSON'
    )
    assert.equal(createMessage.game.status, 'waiting')
})
