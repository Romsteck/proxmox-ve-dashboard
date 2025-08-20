import { mongoServerService } from '../lib/services/mongoServerService';
import { seedData } from './seed-data';

async function globalSetup() {
  await mongoServerService.connect();
  await mongoServerService.clear();
  await mongoServerService.seed(seedData.servers);
  await mongoServerService.disconnect();
}

export default globalSetup;