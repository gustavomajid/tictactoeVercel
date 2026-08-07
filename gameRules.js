const WIN_STATES = Object.freeze([
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
])

function createBoard() {
    return Array(9).fill('')
}

function getWinner(board) {
    for (const state of WIN_STATES) {
        const [first, ...remaining] = state
        const symbol = board[first]

        if (symbol && remaining.every(index => board[index] === symbol)) {
            return symbol
        }
    }

    return null
}

function isDraw(board) {
    return board.every(Boolean) && getWinner(board) === null
}

function isValidMove(board, cellIndex) {
    return Number.isInteger(cellIndex)
        && cellIndex >= 0
        && cellIndex < board.length
        && board[cellIndex] === ''
}

function applyMove(board, cellIndex, symbol) {
    if (symbol !== 'x' && symbol !== 'o') {
        throw new TypeError('Symbol must be x or o')
    }

    if (!isValidMove(board, cellIndex)) {
        throw new RangeError('Move must target an empty board cell')
    }

    const nextBoard = [...board]
    nextBoard[cellIndex] = symbol
    return nextBoard
}

module.exports = {
    WIN_STATES,
    applyMove,
    createBoard,
    getWinner,
    isDraw,
    isValidMove
}
