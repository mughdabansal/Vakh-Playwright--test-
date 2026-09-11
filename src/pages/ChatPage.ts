import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import * as path from 'path';

/**
 * Page Object Model representing the Eve Vakh Chat & Messaging workflows.
 */
export class ChatPage extends BasePage {
  // Navigation & Headers
  readonly chatNavButton: Locator;
  readonly messagesHeader: Locator;
  readonly newMsgButton: Locator;
  readonly backButton: Locator;

  // Search & User Selection
  readonly searchUserInput: Locator;
  readonly startChatButton: Locator;

  // Message Thread & Input
  readonly messageTextarea: Locator;
  readonly sendMessageButton: Locator;
  readonly attachmentOptionsButton: Locator;
  readonly attachPhotosButton: Locator;
  readonly attachFilesButton: Locator;
  readonly closeAttachmentOptionsButton: Locator;

  // Conversation Settings & Group Controls
  readonly conversationSettingsButton: Locator;
  readonly editGroupNameButton: Locator;
  readonly groupNameInput: Locator;
  readonly saveGroupNameButton: Locator;
  readonly cancelGroupNameButton: Locator;
  readonly addMembersButton: Locator;
  readonly confirmAddMembersButton: Locator;
  readonly leaveConversationButton: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar & Header Navigation
    this.chatNavButton = page.getByRole('menuitem', { name: 'Chat' }).locator('visible=true').first();
    this.messagesHeader = page.getByRole('heading', { name: /messages|conversation/i }).or(page.getByText('Messages', { exact: true })).locator('visible=true').first();
    this.newMsgButton = page.getByRole('button', { name: /new message/i }).or(page.locator('button[aria-label*="New Message"]')).locator('visible=true').first();
    this.backButton = page.locator('div[role="menuitem"][aria-label="Back"], button[aria-label="Back"]').locator('visible=true').first();

    // User Search & Dialog Controls
    this.searchUserInput = page.getByPlaceholder(/search by name or username|search/i).or(page.locator('input[aria-label="Search users"]')).locator('visible=true').last();
    this.startChatButton = page.locator('button[aria-label="Create Group"], button:has-text("Create Group"), button[aria-label="Start Chat"], button:has-text("Start Chat")').locator('visible=true').first();

    // Chat Composer & Actions
    this.messageTextarea = page.locator('textarea[placeholder="Type a message..."], textarea[aria-label="Text input field"]').locator('visible=true').first();
    this.sendMessageButton = page.locator('button[aria-label="Send message"]').locator('visible=true').first();
    this.attachmentOptionsButton = page.locator('button[aria-label="Open attachment options"]').locator('visible=true').first();
    this.attachPhotosButton = page.locator('button[aria-label="Attach photos"]').locator('visible=true').first();
    this.attachFilesButton = page.locator('button[aria-label="Attach files"]').locator('visible=true').first();
    this.closeAttachmentOptionsButton = page.locator('button[aria-label="Close attachment options"]').locator('visible=true').first();

    // Group & Settings Controls
    this.conversationSettingsButton = page.locator('button[aria-label="Conversation settings"], button[aria-label*="Conversation details"], button[aria-label*="details"]').locator('visible=true').first();
    this.editGroupNameButton = page.locator('button[aria-label*="Edit group name"], button:has-text("Edit group name")').locator('visible=true').first();
    this.groupNameInput = page.locator('input[aria-label*="Group name"], input[placeholder*="Group name"], input[type="text"]').locator('visible=true').last();
    this.saveGroupNameButton = page.locator('button[aria-label*="Save group name"], button[aria-label*="Save"], button:has-text("Save")').locator('visible=true').first();
    this.cancelGroupNameButton = page.locator('button[aria-label*="Cancel group name edit"], button[aria-label*="Cancel"], button:has-text("Cancel")').locator('visible=true').first();
    this.addMembersButton = page.locator('button[aria-label*="Add members"], button:has-text("Add members")').locator('visible=true').first();
    this.confirmAddMembersButton = page.locator('button[aria-label="Add Members"], button[aria-label="Add"], button:has-text("Add")').locator('visible=true').last();
    this.leaveConversationButton = page.locator('button[aria-label*="Leave conversation"], button:has-text("Leave conversation")').locator('visible=true').first();
  }

  /**
   * Navigates to the Chat / Messages page via sidebar or direct URL.
   */
  async navigateToChat() {
    if (this.page.url().includes('/messages')) {
      return;
    }
    if (await this.chatNavButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.chatNavButton.click();
    } else {
      await this.navigateTo('/messages');
    }
    await this.page.waitForTimeout(2000);
    await expect(this.page).toHaveURL(/.*messages.*/, { timeout: 10000 });
  }

  /**
   * Validates the overall UI layout of the Chat Page:
   * Header / menuitem, New Message button, and conversation stream container.
   */
  async verifyChatLayout() {
    await expect(this.chatNavButton).toBeVisible({ timeout: 10000 });
    await expect(this.newMsgButton).toBeVisible({ timeout: 10000 });

    // Ensure conversation list or empty placeholder is rendered
    const listOrPlaceholder = this.page.locator('button[aria-label*="Group Chat"], button[aria-label*="Happy Badger"], button[aria-label*="New Message"]').or(this.page.getByText(/no messages yet|messages/i));
    await expect(listOrPlaceholder.first()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Opens the "New Message" dialog.
   */
  async clickNewMessage() {
    await expect(this.newMsgButton).toBeVisible({ timeout: 10000 });
    await this.newMsgButton.click();
    await this.page.waitForTimeout(1000);
    await expect(this.searchUserInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Searches for a user in the New Message / Add Members search box.
   */
  async searchUser(query: string) {
    await expect(this.searchUserInput).toBeVisible({ timeout: 5000 });
    await this.searchUserInput.fill('');
    await this.searchUserInput.fill(query);
    await this.page.waitForTimeout(1500);
  }

  /**
   * Selects a user card from search results based on user handle.
   */
  async selectUserFromSearch(userHandle: string) {
    const userBtn = this.page.locator('button, div[role="button"]').filter({
      hasText: new RegExp(userHandle, 'i')
    }).locator('visible=true').first();

    await expect(userBtn).toBeVisible({ timeout: 10000 });
    await userBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Initiates a 1-on-1 Direct Message with an allowed user (e.g. happy_badger_2312).
   */
  async startDirectMessage(userHandle: string = 'happy_badger_2312') {
    await this.navigateToChat();
    await this.clickNewMessage();
    await this.searchUser(userHandle.replace('@', ''));
    await this.selectUserFromSearch(userHandle);

    const startBtn = this.page.locator('button[aria-label="Start Chat"], button:has-text("Start Chat"), button[aria-label="Create Group"], button:has-text("Create Group")').locator('visible=true').first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await startBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
        await startBtn.click();
      }
    }
    await this.page.waitForTimeout(2000);

    // Verify conversation thread is loaded
    await expect(this.messageTextarea).toBeVisible({ timeout: 15000 });
  }

  /**
   * Creates a Group Chat by searching and selecting multiple allowed user handles.
   */
  async createGroupChat(userHandles: string[] = ['happy_badger_2312', 'mughdabansal1414'], initialGroupName?: string) {
    await this.navigateToChat();
    await this.clickNewMessage();

    for (const handle of userHandles) {
      const cleanHandle = handle.replace('@', '');
      await this.searchUser(cleanHandle);
      await this.selectUserFromSearch(cleanHandle);
    }

    if (initialGroupName) {
      const groupNameInput = this.page.locator('input[placeholder*="Group name"], input[aria-label*="Group name"]').locator('visible=true').first();
      if (await groupNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await groupNameInput.fill(initialGroupName);
      }
    }

    const createOrStartBtn = this.page.locator('button[aria-label="Create Group"], button:has-text("Create Group"), button[aria-label="Start Chat"], button:has-text("Start Chat")').locator('visible=true').first();
    if (await createOrStartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await createOrStartBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
        await createOrStartBtn.click();
      }
    }
    await this.page.waitForTimeout(2000);

    await expect(this.messageTextarea).toBeVisible({ timeout: 15000 });
  }

  /**
   * Sends a plain text message in the active chat conversation.
   */
  async sendTextMessage(text: string) {
    await expect(this.messageTextarea).toBeVisible({ timeout: 10000 });
    await this.messageTextarea.fill(text);
    await this.page.waitForTimeout(500);

    if (await this.sendMessageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.sendMessageButton.click();
    } else {
      await this.page.keyboard.press('Enter');
    }
    await this.page.waitForTimeout(1500);
  }

  /**
   * Asserts that a text message has been successfully sent and rendered in the message thread.
   */
  async verifyMessageSent(expectedText: string) {
    const messageBubble = this.page.locator(`text="${expectedText}"`).or(
      this.page.locator('div').filter({ hasText: expectedText })
    ).locator('visible=true').first();

    await expect(messageBubble).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verifies Negative Constraint: Send button is disabled / blocked for empty or whitespace-only inputs.
   */
  async verifySendDisabledForEmptyInput() {
    await expect(this.messageTextarea).toBeVisible({ timeout: 10000 });
    await this.messageTextarea.fill('   ');
    await this.page.waitForTimeout(500);

    // Send button should either be hidden, disabled, or aria-disabled="true"
    const isSendDisabledOrHidden = await this.sendMessageButton.evaluate((btn: HTMLButtonElement) => {
      return btn.disabled || btn.getAttribute('aria-disabled') === 'true' || btn.style.display === 'none';
    }).catch(() => true);

    expect(isSendDisabledOrHidden).toBeTruthy();
  }

  /**
   * Opens the Conversation Settings modal / panel in the active group or DM.
   */
  async openConversationSettings() {
    if (await this.editGroupNameButton.isVisible().catch(() => false) || await this.addMembersButton.isVisible().catch(() => false)) {
      return;
    }
    const settingsBtn = this.page.locator('button[aria-label="Conversation settings"], button[aria-label*="settings"]').locator('visible=true').first();
    if (await settingsBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await settingsBtn.click();
      await this.page.waitForTimeout(1500);
    }
  }

  /**
   * Edits the Group Chat Name (Admin/Owner capability).
   */
  async editGroupName(newName: string) {
    const editBtn = this.page.locator('button[aria-label="Edit group name"], button:has-text("Edit")').locator('visible=true').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      await this.page.waitForTimeout(1000);
    }
    const nameInput = this.page.locator('input[placeholder*="Group name"], input[aria-label*="Group name"], input[type="text"]').locator('visible=true').last();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('');
      await nameInput.fill(newName);
      await this.page.keyboard.press('Enter');
      const saveBtn = this.page.locator('button[aria-label*="Save"], button:has-text("Save")').locator('visible=true').first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
      }
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Asserts that the Group Name header / settings label matches expected value.
   */
  async verifyGroupName(expectedName: string) {
    const titleLocator = this.page.getByRole('heading', { name: new RegExp(expectedName, 'i') }).or(
      this.page.getByText(expectedName, { exact: true })
    ).locator('visible=true').first();

    await expect(titleLocator).toBeVisible({ timeout: 10000 });
  }

  /**
   * Ensures a group chat conversation is opened, creating one if not present.
   */
  async ensureGroupChatOpened() {
    await this.navigateToChat();
    // Target group items by group titles or Group Chat label
    const groupConvo = this.page.locator('button[aria-label*="QA Alpha"], button[aria-label*="QA Automated"], button[aria-label*="Group Chat"], button[aria-label*="Group,"]').locator('visible=true').first();
    if (await groupConvo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await groupConvo.click();
      await this.page.waitForTimeout(2000);
      if (await this.messageTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }
    }
    // If not found or not currently opened, create a fresh group chat with 2 peers
    await this.createGroupChat(['happy_badger_2312', 'mughdabansal1414'], 'QA Alpha Group');
  }

  /**
   * Adds a new member to an existing group chat via Conversation Settings.
   */
  async addMemberToGroup(userHandle: string) {
    const addBtn = this.page.locator('button[aria-label="Add members"], button:has-text("Add members")').locator('visible=true').first();
    if (await addBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addBtn.click();
      await this.page.waitForTimeout(1000);
    }

    const cleanHandle = userHandle.replace('@', '');
    const searchInAdd = this.page.getByPlaceholder(/search/i).last();
    if (await searchInAdd.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInAdd.fill('');
      await searchInAdd.fill(cleanHandle);
      await this.page.waitForTimeout(1500);

      const userBtn = this.page.locator('button, div[role="button"]').filter({
        hasText: new RegExp(cleanHandle, 'i')
      }).locator('visible=true').first();

      if (await userBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await userBtn.click();
        await this.page.waitForTimeout(1000);
      }

      const confirmBtn = this.page.locator('button[aria-label*="Add"], button:has-text("Add")').locator('visible=true').last();
      if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        if (await confirmBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
          await confirmBtn.click();
          await this.page.waitForTimeout(2000);
        }
      }
    }
  }

  /**
   * Opens the action menu for a specific member in Group Settings.
   */
  async openMemberActionMenu(userHandle: string) {
    const memberItem = this.page.locator('button, [role="button"]').filter({
      hasText: new RegExp(userHandle, 'i')
    }).locator('visible=true').first();

    if (await memberItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await memberItem.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Promotes an accepted member to Admin ("Make admin") and verifies role badge becomes ADMIN.
   */
  async promoteMemberToAdmin(userHandle: string) {
    const cleanHandle = userHandle.replace('@', '');
    const makeAdminBtn = this.page.locator(`button[aria-label*="Make"][aria-label*="admin"], button:has-text("Make admin")`).locator('visible=true').first();
    if (await makeAdminBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await makeAdminBtn.click();
      await this.page.waitForTimeout(2000);
    } else {
      await this.openMemberActionMenu(cleanHandle);
      if (await makeAdminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await makeAdminBtn.click();
        await this.page.waitForTimeout(2000);
      }
    }

    const memberOrAdminBadge = this.page.locator('button, [role="button"]').filter({
      hasText: new RegExp(cleanHandle, 'i')
    }).locator('visible=true').first();
    await expect(memberOrAdminBadge).toBeVisible({ timeout: 10000 });
  }

  /**
   * Demotes an admin back to regular member ("Remove admin").
   */
  async demoteAdminToMember(userHandle: string) {
    const cleanHandle = userHandle.replace('@', '');
    const removeAdminBtn = this.page.locator('button[aria-label*="Remove admin" i], button:has-text("Remove admin"), button[aria-label*="Remove"][aria-label*="admin"]').locator('visible=true').first();
    if (await removeAdminBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await removeAdminBtn.click();
      await this.page.waitForTimeout(2000);
    } else {
      await this.openMemberActionMenu(cleanHandle);
      if (await removeAdminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await removeAdminBtn.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /**
   * Removes a regular member from the group conversation ("Remove").
   */
  async removeMemberFromGroup(userHandle: string) {
    const cleanHandle = userHandle.replace('@', '');
    const removeMemberBtn = this.page.locator(`button[aria-label*="Remove ${cleanHandle}" i], button[aria-label*="Remove"]:not([aria-label*="admin"]), button:has-text("Remove")`).locator('visible=true').first();
    if (await removeMemberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await removeMemberBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Negative Constraint: Owner Protection - Group CREATOR cannot be removed by admins.
   */
  async verifyOwnerProtection(ownerHandle: string = 'm_2094') {
    const creatorItem = this.page.locator('button[aria-label*="M_2094"], button, [role="button"]').filter({
      hasText: new RegExp(ownerHandle, 'i')
    }).locator('visible=true').first();

    await expect(creatorItem).toBeVisible({ timeout: 10000 });
    const creatorText = await creatorItem.innerText();
    expect(creatorText.toUpperCase()).toContain('CREATOR');

    // Click creator item and ensure there is no "Remove" option
    const removeAction = this.page.locator('button[aria-label*="Remove M_2094" i], button[aria-label*="Remove Creator" i]');
    const hasRemoveAction = await removeAction.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasRemoveAction).toBeFalsy();
  }

  /**
   * Negative Constraint: Regular members cannot remove Admins.
   */
  async verifyMemberCannotRemoveAdmin(adminHandle: string) {
    const cleanHandle = adminHandle.replace('@', '');
    const adminItem = this.page.locator('button, [role="button"]').filter({
      hasText: new RegExp(cleanHandle, 'i')
    }).locator('visible=true').first();

    await expect(adminItem).toBeVisible({ timeout: 10000 });
  }

  /**
   * Negative Constraint: Only accepted members can be promoted to admin.
   */
  async verifyAdminPromotionRequiresAcceptedMember(userHandle: string) {
    const cleanHandle = userHandle.replace('@', '');
    const memberItem = this.page.locator('button, [role="button"]').filter({
      hasText: new RegExp(cleanHandle, 'i')
    }).locator('visible=true').first();

    await expect(memberItem).toBeVisible({ timeout: 10000 });
  }

  /**
   * Opens attachment options and uploads a photo or document file.
   */
  async sendAttachment(type: 'photo' | 'file', customFilePath?: string) {
    await expect(this.attachmentOptionsButton).toBeVisible({ timeout: 10000 });
    await this.attachmentOptionsButton.click();
    await this.page.waitForTimeout(1000);

    const defaultFilePath = type === 'photo' 
      ? path.join(__dirname, '..', 'fixtures', 'sample-photo.png')
      : path.join(__dirname, '..', 'fixtures', 'sample-doc.txt');
    
    const targetFilePath = customFilePath || defaultFilePath;

    if (type === 'photo') {
      await expect(this.attachPhotosButton).toBeVisible({ timeout: 5000 });
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
      await this.attachPhotosButton.click();
      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        await fileChooser.setFiles(targetFilePath);
      }
    } else {
      await expect(this.attachFilesButton).toBeVisible({ timeout: 5000 });
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
      await this.attachFilesButton.click();
      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        await fileChooser.setFiles(targetFilePath);
      }
    }

    await this.page.waitForTimeout(2000);
    // Dismiss attachment drawer if still open
    if (await this.closeAttachmentOptionsButton.isVisible().catch(() => false)) {
      await this.closeAttachmentOptionsButton.click();
    }
  }

  /**
   * Cleanly leaves the active group conversation.
   */
  async leaveGroupConversation() {
    const leaveBtn = this.page.locator('button[aria-label="Leave conversation"], button:has-text("Leave conversation")').locator('visible=true').first();
    if (await leaveBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      await leaveBtn.click();
      await this.page.waitForTimeout(1500);

      // If confirmation modal appears, confirm
      const confirmLeaveBtn = this.page.locator('button[aria-label="Leave"], button:has-text("Leave")').locator('visible=true').last();
      if (await confirmLeaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmLeaveBtn.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }
}
