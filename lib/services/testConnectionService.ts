import * as realService from './connectionService';
import { createTestMockClient } from '../proxmox/adapters/mock-test';

let exportedService;

if (process.env.NODE_ENV === 'test') {
  const mockClient = createTestMockClient();
  exportedService = {
    ...realService,
    testConnection: async () => ({ success: true, responseTime: 0 }),
    getClusterSummary: mockClient.getClusterSummary,
    getNodeMetrics: mockClient.getNodeMetrics,
    streamEvents: mockClient.streamEvents,
    getVmList: mockClient.getVmList,
    getVmDetails: mockClient.getVmDetails,
    performVmAction: mockClient.performVmAction,
    getHistoricalMetrics: mockClient.getHistoricalMetrics,
    getSystemLogs: mockClient.getSystemLogs,
    getBackupJobs: mockClient.getBackupJobs,
    getServiceStatus: mockClient.getServiceStatus,
    getActiveAlerts: mockClient.getActiveAlerts,
    acknowledgeAlert: mockClient.acknowledgeAlert,
  };
} else {
  exportedService = realService;
}

const ConnectionService = exportedService;
export { ConnectionService };