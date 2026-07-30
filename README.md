# Online Tic-Tac-Toe

Jogo da velha multiplayer com cliente web, servidor Node.js e comunicação por WebSocket.

## Arquitetura

- `client.html` e `clientScript.js`: interface e envio das intenções do jogador;
- `webServer.js`: conexões, partidas, turnos e transmissão do estado;
- `gameRules.js`: regras puras de movimento, vitória e empate;
- `test/gameRules.test.js`: testes determinísticos usando o test runner nativo do Node.js.

O navegador envia somente `gameId`, `clientId` e `cellIndex`. O servidor verifica se o jogador possui o turno, se a célula existe e se está vazia antes de alterar o tabuleiro. Dessa forma, o cliente não controla o estado oficial da partida.

## Executar

Requisitos: Node.js 22 e npm.

```bash
npm ci
npm start
```

O servidor WebSocket fica disponível na porta `8080`. Abra `client.html` em dois navegadores para criar e entrar em uma partida.

## Validar

```bash
npm run check
npm test
```

O CI executa ambos os comandos em pushes e pull requests.

## Próximas melhorias

Consulte [TASK.md](TASK.md). Os conceitos e decisões de cada entrega ficam registrados em [STUDY_LOG.md](STUDY_LOG.md).
