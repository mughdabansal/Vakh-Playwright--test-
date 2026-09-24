import { ApiClient } from '../client/ApiClient';

export class MessagingHelper {
  constructor(private apiClient: ApiClient) {}

  /**
   * Sends a message request to initiate contact with another user.
   */
  public async sendMessageRequest(
    senderCookie: string,
    recipientId: string,
    content: string = 'Hello, connecting!'
  ) {
    return this.apiClient.post('/api/messages/requests', {
      headers: { cookie: senderCookie },
      data: { recipientId, content },
    });
  }

  /**
   * Responds to a message request (accept or decline).
   */
  public async respondToRequest(
    recipientCookie: string,
    requestId: string,
    action: 'accept' | 'decline'
  ) {
    return this.apiClient.post(`/api/messages/requests/${requestId}/${action}`, {
      headers: { cookie: recipientCookie },
    });
  }

  /**
   * Fuzzes the decline privacy invariant:
   * Asserts that a sender cannot distinguish between an unanswered pending request
   * and a declined request via timing latency, response status, or body structure.
   */
  public async measureSenderPerspective(
    senderCookie: string,
    conversationOrRequestId: string
  ): Promise<{ status: number; latencyMs: number; body: any }> {
    const response = await this.apiClient.get(`/api/messages/requests/${conversationOrRequestId}`, {
      headers: { cookie: senderCookie },
    });

    return {
      status: response.status,
      latencyMs: response.latencyMs,
      body: response.data,
    };
  }

  /**
   * Attempts to send a message to a conversation where the counterparty account was deleted.
   * Expects specific HTTP 400 Bad Request error contract.
   */
  public async sendMessageToDeletedUser(
    senderCookie: string,
    conversationId: string,
    content: string = 'Test message'
  ) {
    return this.apiClient.post(`/api/conversations/${conversationId}/messages`, {
      headers: { cookie: senderCookie },
      data: { content },
    });
  }
}
