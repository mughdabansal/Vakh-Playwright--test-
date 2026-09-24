import { request } from '@playwright/test';
import { ApiClient } from '../src/api/client/ApiClient';
import { SeedHelper } from '../src/api/helpers/seed.helper';
import { TEST_USERS } from '../src/config/constants';

async function main() {
  console.log('Seeding deterministic Vakh API fixtures...');
  const reqContext = await request.newContext();
  const client = new ApiClient(reqContext);
  const seeder = new SeedHelper(client);

  try {
    const { formId, postId } = await seeder.ensureTestEntities('vakh_session=mock-primary');
    console.log(`Successfully provisioned test fixtures:`);
    console.log(`- Form ID: ${formId}`);
    console.log(`- Post ID: ${postId}`);
  } catch (err: any) {
    console.error('Fixture seeding error:', err.message);
  } finally {
    await reqContext.dispose();
  }
}

main().catch(console.error);
