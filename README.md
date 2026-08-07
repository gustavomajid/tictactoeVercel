# Online Tic-Tac-Toe

Jogo da velha multiplayer com cliente web, servidor Node.js e comunicação por WebSocket.

## Arquitetura

- `client.html` e `clientScript.js`: interface e envio das intenções do jogador;
- `webServer.js`: conexões, partidas, turnos e transmissão do estado;
- `gameRules.js`: regras puras de movimento, vitória e empate;
- `test/gameRules.test.js`: testes determinísticos das regras puras;
- `test/webServer.integration.test.js`: testes do protocolo e da autoridade do servidor.

O navegador envia somente `gameId` e `cellIndex` ao jogar. O servidor identifica o jogador pela conexão WebSocket, verifica turno, estado da partida, intervalo e ocupação antes de alterar o tabuleiro. Dessa forma, o cliente não controla sua identidade nem o estado oficial da partida.

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
