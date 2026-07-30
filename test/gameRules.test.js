const test = require('node:test')
const assert = require('node:assert/strict')

const {
    applyMove,
    createBoard,
    getWinner,
    isDraw,
    isValidMove
} = require('../gameRules')

test('creates an empty nine-cell board', () => {
    assert.deepEqual(createBoard(), ['', '', '', '', '', '', '', '', ''])
})

test('detects horizontal, vertical and diagonal winners', () => {
    assert.equal(getWinner(['x', 'x', 'x', '', '', '', '', '', '']), 'x')
    assert.equal(getWinner(['o', '', '', 'o', '', '', 'o', '', '']), 'o')
    assert.equal(getWinner(['x', '', '', '', 'x', '', '', '', 'x']), 'x')
})

test('does not report a winner for an unfinished game', () => {
    assert.equal(getWinner(['x', 'o', '', '', 'x', '', '', '', 'o']), null)
})

test('only reports a draw when the board is full and has no winner', () => {
    assert.equal(isDraw(['x', 'o', 'x', 'x', 'o', 'o', 'o', 'x', 'x']), true)
    assert.equal(isDraw(['x', 'o', '', '', '', '', '', '', '']), false)
    assert.equal(isDraw(['x', 'x', 'x', 'o', 'o', '', '', '', '']), false)
})

test('accepts only empty cells inside the board', () => {
    const board = createBoard()
    board[4] = 'x'

    assert.equal(isValidMove(board, 3), true)
    assert.equal(isValidMove(board, 4), false)
    assert.equal(isValidMove(board, -1), false)
    assert.equal(isValidMove(board, 9), false)
    assert.equal(isValidMove(board, 1.5), false)
})

test('applies a move without mutating the current board', () => {
    const board = createBoard()
    const nextBoard = applyMove(board, 4, 'x')

    assert.equal(board[4], '')
    assert.equal(nextBoard[4], 'x')
    assert.notEqual(nextBoard, board)
})

test('rejects occupied cells and unknown symbols', () => {
    const board = createBoard()
    board[0] = 'o'

    assert.throws(() => applyMove(board, 0, 'x'), RangeError)
    assert.throws(() => applyMove(board, 1, 'z'), TypeError)
})
