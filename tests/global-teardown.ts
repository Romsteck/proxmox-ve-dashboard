import { mongoServerService } from '../lib/services/mongoServerService';

async function globalTeardown() {
  await mongoServerService.connect();
  await mongoServerService.clear();
  await mongoServerService.disconnect();
}

export default globalTeardown;