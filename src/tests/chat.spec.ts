import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ChatPage } from '../pages/ChatPage';
import { TEST_USERS } from '../config/constants';

test.describe('Eve Vakh - Chat & Messaging Comprehensive Test Suite', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    // 1. Navigate to landing page and reach sign-in
    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();

    // 2. Perform authenticated login with primary user (@m_2094)
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      TEST_USERS.DEFAULT_USER.email,
      TEST_USERS.DEFAULT_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: Chat UI Layout, Search & Conversation List Validation
   * Validates:
   *  - Messages / Chat header is displayed.
   *  - New Message button is visible and active.
   *  - Conversation list cards or empty placeholder rendered properly.
   */
  test('TC_CHAT_001: should validate chat page UI layout, navigation and conversation stream', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.navigateToChat();
    await chatPage.verifyChatLayout();
    await expect(page).toHaveURL(/.*messages.*/);
  });

  /**
   * Test Case 2: One-on-One Direct Chat & Real-Time Message Transmission
   * Validates:
   *  - Initiates 1-on-1 DM with allowed user (@happy_badger_2312).
   *  - Types and sends a unique text message.
   *  - Asserts that the sent message bubble is rendered in the active chat thread.
   */
  test('TC_CHAT_002: should initiate 1-on-1 direct chat and deliver text message to allowed user', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const uniqueMsg = `QA Test Direct Message from @m_2094 [${Date.now()}]`;

    await chatPage.startDirectMessage('happy_badger_2312');
    await chatPage.sendTextMessage(uniqueMsg);
    await chatPage.verifyMessageSent(uniqueMsg);
  });

  /**
   * Test Case 3: Group Chat Creation with Multiple Allowed Peers
   * Validates:
   *  - Selects multiple allowed contacts (@happy_badger_2312, @mughdabansal1414).
   *  - Clicks "Start Chat" to launch group conversation.
   *  - Asserts conversation thread is opened and message input is ready.
   */
  test('TC_CHAT_003: should create a new group chat with multiple allowed peers', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.createGroupChat(['happy_badger_2312', 'mughdabansal1414']);
    await expect(chatPage.messageTextarea).toBeVisible({ timeout: 15000 });
  });

  /**
   * Test Case 4: Group Chat Name Modification by Group Admin / Owner
   * Validates:
   *  - Admin opens Conversation Settings in group chat.
   *  - Modifies group name to "Automated QA Group [timestamp]".
   *  - Saves and asserts real-time title update in header.
   */
  test('TC_CHAT_004: should allow group admin/owner to edit and save group chat name', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const updatedGroupName = `QA Alpha Group ${Date.now() % 10000}`;

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.editGroupName(updatedGroupName);
    await chatPage.verifyGroupName(updatedGroupName);
  });

  /**
   * Test Case 5: Adding New Allowed Member to Existing Group Chat
   * Validates:
   *  - Opens Conversation Settings.
   *  - Clicks "Add members", searches for allowed user (@mughdabansal1414), and confirms addition.
   *  - Asserts new member is added to group roster.
   */
  test('TC_CHAT_005: should add allowed member to an existing group chat', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.addMemberToGroup('happy_badger_2312');
  });

  /**
   * Test Case 6: Promoting Accepted Member to Admin ("Make Admin")
   * Validates:
   *  - Opens member action menu for accepted member (@happy_badger_2312).
   *  - Executes "Make admin" action.
   *  - Asserts role badge reflects ADMIN status.
   */
  test('TC_CHAT_006: should promote eligible member to group admin role', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.promoteMemberToAdmin('happy_badger_2312');
  });

  /**
   * Test Case 7: Demoting Admin back to Regular Member ("Remove Admin")
   * Validates:
   *  - Selects admin user in group settings.
   *  - Clicks "Remove admin".
   *  - Asserts admin privileges are revoked.
   */
  test('TC_CHAT_007: should demote admin back to regular member', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.demoteAdminToMember('happy_badger_2312');
  });

  /**
   * Test Case 8: Removing Member from Group Chat
   * Validates:
   *  - Admin selects regular member in group settings.
   *  - Clicks "Remove" and confirms removal.
   */
  test('TC_CHAT_008: should allow group admin to remove member from group', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.removeMemberFromGroup('happy_badger_2312');
  });

  /**
   * Test Case 9: Sending Photo / Image Attachments in Chat Thread
   * Validates:
   *  - Opens attachment options menu.
   *  - Selects "Attach photos" and uploads sample PNG image fixture.
   */
  test('TC_CHAT_009: should open attachment drawer and select photo attachment', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.startDirectMessage('happy_badger_2312');
    await chatPage.sendAttachment('photo');
    await expect(chatPage.messageTextarea).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test Case 10: Sending Document / File Attachments in Chat Thread
   * Validates:
   *  - Opens attachment options menu.
   *  - Selects "Attach files" and uploads sample document fixture.
   */
  test('TC_CHAT_010: should open attachment drawer and select document file attachment', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.startDirectMessage('happy_badger_2312');
    await chatPage.sendAttachment('file');
    await expect(chatPage.messageTextarea).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test Case 11: Cleanly Leaving Group Conversation
   * Validates:
   *  - Opens group settings and clicks "Leave conversation".
   *  - Asserts conversation is exited cleanly without app crash.
   */
  test('TC_CHAT_011: should allow user to leave group conversation', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.leaveGroupConversation();
  });

  /**
   * Test Case 12 [Negative]: Empty & Whitespace Message Submission Prevention
   * Validates:
   *  - Typing spaces or empty text disables the Send button or blocks submission.
   */
  test('TC_CHAT_012: [Negative] should disable send button for empty or whitespace-only messages', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.startDirectMessage('happy_badger_2312');
    await chatPage.verifySendDisabledForEmptyInput();
  });

  /**
   * Test Case 13 [Negative]: Owner / Creator Protection Against Admin Removal
   * Validates:
   *  - The group CREATOR / Owner (@m_2094) cannot be removed or demoted by any admin.
   */
  test('TC_CHAT_013: [Negative] should protect group creator from removal by other admins', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.verifyOwnerProtection('m_2094');
  });

  /**
   * Test Case 14 [Negative]: Regular Members Cannot Remove Admin
   * Validates:
   *  - Non-admin members do not possess permissions to remove or demote admins.
   */
  test('TC_CHAT_014: [Negative] should restrict regular members from removing admin users', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.verifyMemberCannotRemoveAdmin('happy_badger_2312');
  });

  /**
   * Test Case 15 [Negative]: Admin Promotion Requires Accepted Membership
   * Validates:
   *  - Users in pending invitation state cannot be promoted to admin before accepting.
   */
  test('TC_CHAT_015: [Negative] should enforce that only accepted members can be promoted to admin', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened();
    await chatPage.openConversationSettings();
    await chatPage.verifyAdminPromotionRequiresAcceptedMember('happy_badger_2312');
  });

  /**
   * Test Case 16 [Edge]: Emoji, Multi-Line & Special Character Formatting
   * Validates:
   *  - Message input handles emojis, special symbols, and multi-line linebreaks without DOM breakage.
   */
  test('TC_CHAT_016: [Edge] should successfully send rich text with emojis and multi-line linebreaks', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const richMessage = `🚀 QA Automation Test 🧪\nLine 2: Special chars: @#$%^&*()\nLine 3: Timestamp: ${Date.now()}`;

    await chatPage.startDirectMessage('happy_badger_2312');
    await chatPage.sendTextMessage(richMessage);
    await chatPage.verifyMessageSent('QA Automation Test');
  });
});
