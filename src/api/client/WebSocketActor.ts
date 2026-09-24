/**
 * WebSocketActor: Harness for real-time actor testing, session lifecycle,
 * close code classification, and 5/6-session eviction verification.
 */
export class WebSocketActor {
  private ws: WebSocket | null = null;
  public messages: any[] = [];
  public closeEvent: { code: number; reason: string; wasClean: boolean } | null = null;
  public isConnected: boolean = false;

  constructor(
    private url: string,
    private tokenOrCookie?: string
  ) {}

  public async connect(timeoutMs: number = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }
        reject(new Error(`WebSocket connection timed out after ${timeoutMs}ms to ${this.url}`));
      }, timeoutMs);

      try {
        const protocols = this.tokenOrCookie ? [this.tokenOrCookie] : undefined;
        this.ws = new WebSocket(this.url, protocols);

        this.ws.onopen = () => {
          clearTimeout(timer);
          this.isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            this.messages.push(data);
          } catch {
            this.messages.push(event.data.toString());
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(timer);
          this.isConnected = false;
          this.closeEvent = {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          };
        };

        this.ws.onerror = (err) => {
          // If error occurs before open, let timer reject or reject directly
        };
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  public send(payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Cannot send message: WebSocket is not open');
    }
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.ws.send(message);
  }

  public async waitForClose(timeoutMs: number = 5000): Promise<{ code: number; reason: string }> {
    if (this.closeEvent) {
      return this.closeEvent;
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for WebSocket close after ${timeoutMs}ms`));
      }, timeoutMs);

      const checkInterval = setInterval(() => {
        if (this.closeEvent) {
          clearInterval(checkInterval);
          clearTimeout(timer);
          resolve(this.closeEvent);
        }
      }, 50);
    });
  }

  public disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  /**
   * Helper to classify WebSocket close codes according to Vakh reconnection rules
   */
  public static shouldReconnect(code: number, reason: string = ''): boolean {
    // 1001 (going away / evicted) -> reconnect
    if (code === 1001) return true;
    // 1008 with session_not_found or transient_* -> reconnect
    if (code === 1008 && (reason.includes('session_not_found') || reason.includes('transient_'))) {
      return true;
    }
    // 1008 with permission_revoked -> do NOT reconnect
    if (code === 1008 && reason.includes('permission_revoked')) {
      return false;
    }
    return false;
  }
}
