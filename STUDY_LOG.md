# Diário de estudo

## 2026-07-30 — Servidor como fonte da verdade

### Problema

O cliente enviava o objeto inteiro da partida após cada jogada. O servidor substituía seu tabuleiro pelo conteúdo recebido sem conferir o turno, a célula ou quantas posições haviam mudado. Um cliente modificado poderia jogar pelo adversário ou alterar várias células.

### Solução

- O cliente passou a enviar apenas a intenção: partida e posição.
- A identidade do jogador passou a ser obtida da conexão WebSocket, nunca do payload.
- O servidor mantém e altera o tabuleiro oficial.
- As regras de movimento, vitória e empate foram extraídas para funções puras.
- Movimentos fora do tabuleiro, fracionários ou sobre células ocupadas são rejeitados.
- Partidas encerradas rejeitam novas jogadas e mensagens inválidas não derrubam o processo.

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

Sete testes cobrem as regras puras. Três testes de integração cobrem identidade vinculada à conexão, estado terminal e mensagens JSON inválidas.

### Exercício

Explique por que receber um tabuleiro completo dificulta descobrir se o jogador alterou uma ou várias células. Depois descreva quais dados mínimos uma intenção de jogada deve carregar.
