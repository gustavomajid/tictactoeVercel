# Diário de estudo

## 2026-07-30 — Servidor como fonte da verdade

### Problema

O cliente enviava o objeto inteiro da partida após cada jogada. O servidor substituía seu tabuleiro pelo conteúdo recebido sem conferir o turno, a célula ou quantas posições haviam mudado. Um cliente modificado poderia jogar pelo adversário ou alterar várias células.

### Solução

- O cliente passou a enviar apenas a intenção: partida, jogador e posição.
- O servidor mantém e altera o tabuleiro oficial.
- As regras de movimento, vitória e empate foram extraídas para funções puras.
- Movimentos fora do tabuleiro, fracionários ou sobre células ocupadas são rejeitados.

### Conceitos praticados

- servidor autoritativo em aplicações multiplayer;
- fronteiras de confiança e validação de entrada;
- funções puras e imutabilidade;
- testes com `node:test` e `node:assert`;
- separação entre transporte WebSocket e regras de domínio.

### Validação

```bash
npm ci
npm run check
npm test
```

Sete testes cobrem criação do tabuleiro, vitórias horizontais, verticais e diagonais, partidas incompletas, empate, validade e imutabilidade dos movimentos.

### Exercício

Explique por que receber um tabuleiro completo dificulta descobrir se o jogador alterou uma ou várias células. Depois descreva quais dados mínimos uma intenção de jogada deve carregar.
