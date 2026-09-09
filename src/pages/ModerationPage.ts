import { Page, Locator, expect, APIRequestContext } from '@playwright/test';
import { BasePage } from './BasePage';
import { APP_CONFIG } from '../config/constants';

/**
 * Page Object Model representing Form Owner Moderation & Form History review.
 */
export class ModerationPage extends BasePage {
  readonly moderationHistoryHeader?: Locator;
  readonly pendingReviewList?: Locator;
  readonly approvePostBtn?: Locator;
  readonly rejectPostBtn?: Locator;
  readonly statusBadge?: Locator;

  constructor(page?: Page) {
    if (page) {
      super(page);
      this.moderationHistoryHeader = page.getByText(/history|moderation|review/i).first();
      this.pendingReviewList = page.locator('[data-testid="moderation-posts-list"]').or(page.locator('[data-testid="post-card"]'));
      this.approvePostBtn = page.getByRole('button', { name: /accept|approve|publish/i }).first();
      this.rejectPostBtn = page.getByRole('button', { name: /reject|decline/i }).first();
      this.statusBadge = page.locator('[data-testid="post-status-badge"]').or(page.locator('text=needs_review')).first();
    } else {
      super(null as any);
    }
  }

  /**
   * Fetches the moderation posts queue for a specific form from the API.
   */
  async fetchFormModerationQueue(request: APIRequestContext, formId: string, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return await request.get(`${APP_CONFIG.API_URL}/api/forms/${formId}/moderation-posts`, {
      headers
    });
  }

  /**
   * Executes the Form Owner post approval / accept action.
   */
  async approvePostReview(request: APIRequestContext, postId: string, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Idempotent': 'true',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return await request.post(`${APP_CONFIG.API_URL}/api/posts/${postId}/review/publish`, {
      headers,
      data: {}
    });
  }

  /**
   * Executes the Form Owner post rejection action.
   */
  async rejectPostReview(request: APIRequestContext, postId: string, token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Idempotent': 'true',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return await request.post(`${APP_CONFIG.API_URL}/api/posts/${postId}/review/reject`, {
      headers,
      data: {}
    });
  }

  /**
   * Fetches the post history log for moderation tracking.
   */
  async fetchPostHistory(request: APIRequestContext, status = 'all', token?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return await request.get(`${APP_CONFIG.API_URL}/api/posts/history`, {
      headers,
      params: { status }
    });
  }
}
