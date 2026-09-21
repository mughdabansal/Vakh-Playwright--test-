import { test, expect } from '@playwright/test';
import { HomePage } from '../../../pages/HomePage';
import { LoginPage } from '../../../pages/LoginPage';
import { ChatPage } from '../../../pages/ChatPage';
import { SANITY_3_DATA } from './data/sanity3.data';

test.describe('Eve Vakh - Sanity 3.0: Chat & Collaboration (DM, Group, Members, Admin Roles)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.goto();
    await homePage.clickWebLink();
    await loginPage.verifyIsOnLoginPage();
    await loginPage.clickUsePassword();
    await loginPage.loginWithPassword(
      SANITY_3_DATA.AUTH.PRIMARY_USER.email,
      SANITY_3_DATA.AUTH.PRIMARY_USER.password
    );
    await loginPage.verifyLoggedInState();
  });

  /**
   * Test Case 1: 1-on-1 Direct Chat & Message Delivery to Allowed User
   * Validates:
   *  - Initiates 1-on-1 direct conversation with allowed peer (@happy_badger_2312).
   *  - Sends dynamic text message.
   *  - Asserts that the sent message bubble appears in conversation view.
   */
  test('TC_S3_CHAT_001: should initiate 1-on-1 direct chat and deliver message to allowed peer', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const uniqueMsg = SANITY_3_DATA.CHAT.DIRECT_MESSAGE();

    await chatPage.startDirectMessage(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
    await chatPage.sendTextMessage(uniqueMsg);
    await chatPage.verifyMessageSent(uniqueMsg);
  });

  /**
   * Test Case 2: Group Chat Access & Group Name Modification
   * Validates:
   *  - Accesses dedicated group chat (QA Alpha Group).
   *  - Opens Conversation Settings.
   *  - Modifies group name and saves.
   *  - Asserts updated group name in header.
   */
  test('TC_S3_CHAT_002: should open group chat and edit group name as admin', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const groupName = SANITY_3_DATA.CHAT.GROUP_NAME;

    await chatPage.ensureGroupChatOpened(groupName);
    await chatPage.openConversationSettings();
    await chatPage.editGroupName(groupName);
    await chatPage.verifyGroupName(groupName);
  });

  /**
   * Test Case 3: Adding Allowed Member to Group & Role Promotion (Make Admin)
   * Validates:
   *  - Adds allowed user (@happy_badger_2312) to the group.
   *  - Opens member actions and executes "Make admin".
   *  - Asserts member has admin status.
   */
  test('TC_S3_CHAT_003: should add allowed member and promote to group admin role', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened(SANITY_3_DATA.CHAT.GROUP_NAME);
    await chatPage.openConversationSettings();
    await chatPage.addMemberToGroup(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
    await chatPage.promoteMemberToAdmin(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
  });

  /**
   * Test Case 4: Member Demotion & Removal from Group Chat
   * Validates:
   *  - Demotes admin back to regular member.
   *  - Removes member from the group.
   */
  test('TC_S3_CHAT_004: should demote admin and remove member from group chat', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.ensureGroupChatOpened(SANITY_3_DATA.CHAT.GROUP_NAME);
    await chatPage.openConversationSettings();
    await chatPage.demoteAdminToMember(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
    await chatPage.removeMemberFromGroup(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
  });

  /**
   * Test Case 5: Cross-Group Messaging & Attachment Drawer Validation
   * Validates:
   *  - Opens attachment drawer (Photos / Files).
   *  - Verifies multi-functional access across group chat thread.
   */
  test('TC_S3_CHAT_005: should verify cross-group messaging controls and attachment drawer', async ({ page }) => {
    const chatPage = new ChatPage(page);

    await chatPage.startDirectMessage(SANITY_3_DATA.AUTH.ALLOWED_PEERS.HAPPY_BADGER);
    await chatPage.sendAttachment('photo');
    await expect(chatPage.messageTextarea).toBeVisible({ timeout: 10000 });
  });
});
