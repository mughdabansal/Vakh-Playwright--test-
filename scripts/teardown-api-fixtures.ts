import { request } from '@playwright/test';
import { ApiClient } from '../src/api/client/ApiClient';
import { SeedHelper } from '../src/api/helpers/seed.helper';

async function main() {
  console.log('Teardown Vakh API tagged test fixtures...');
  const reqContext = await request.newContext();
  const client = new ApiClient(reqContext);
  const seeder = new SeedHelper(client);

  try {
    await seeder.teardownTestEntities('vakh_session=mock-primary', {
      forms: ['test-tagged-form-1'],
      posts: ['test-tagged-post-1'],
    });
    console.log('Teardown completed successfully.');
  } catch (err: any) {
    console.error('Teardown error:', err.message);
  } finally {
    await reqContext.dispose();
  }
}

main().catch(console.error);
