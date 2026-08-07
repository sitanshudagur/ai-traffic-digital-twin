/**
 * WebSocket client stub for future FastAPI integration.
 *
 * Expected backend URL: ws://localhost:8000/ws/traffic
 *
 * Usage (future):
 *   const client = createSocketClient('ws://localhost:8000/ws/traffic');
 *   client.onMessage((data) => trafficService.setState(trafficService.normalizeWebSocketMessage(data)));
 *   client.connect();
 */

export function createSocketClient(url = 'ws://localhost:8000/ws') {
  let socket = null;
  let messageHandler = null;
  let openHandler = null;
  let closeHandler = null;
  let errorHandler = null;
  let reconnectTimer = null;
  let manuallyClosed = false;

  function safeConnect() {
    if (typeof WebSocket === 'undefined') return;
    if (socket && socket.readyState === WebSocket.OPEN) return;

    socket = new WebSocket(url);

    socket.onopen = () => {
      manuallyClosed = false;
      openHandler?.();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messageHandler?.(data);
      } catch (err) {
        console.error('[socketClient] Failed to parse message:', err);
      }
    };

    socket.onclose = (event) => {
      closeHandler?.(event);
      if (!manuallyClosed) {
        reconnectTimer = setTimeout(() => safeConnect(), 3000);
      }
    };

    socket.onerror = (err) => {
      errorHandler?.(err);
      console.error('[socketClient] WebSocket error:', err);
    };
  }

  return {
    connect() {
      manuallyClosed = false;
      safeConnect();
    },

    disconnect() {
      manuallyClosed = true;
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.close();
      }
      socket = null;
    },

    onMessage(handler) {
      messageHandler = handler;
    },

    onOpen(handler) {
      openHandler = handler;
    },

    onClose(handler) {
      closeHandler = handler;
    },

    onError(handler) {
      errorHandler = handler;
    },

    send(data) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      }
    },
  };
}

export default createSocketClient;
