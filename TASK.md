# Plano de evolução

## Estado autoritativo no servidor

- [x] Extrair regras puras do jogo
- [x] Enviar somente a posição escolhida pelo cliente
- [x] Validar turno, intervalo e ocupação da célula no servidor
- [x] Testar vitórias, empate e movimentos inválidos
- [x] Corrigir o comando de inicialização do `Procfile`
- [x] Adicionar verificação automática no GitHub Actions

## Próxima entrega

Tratar desconexões: remover clientes, cancelar ou encerrar partidas órfãs e testar a limpeza sem depender de conexões WebSocket reais.
