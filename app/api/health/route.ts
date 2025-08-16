/**
 * Health check endpoint for monitoring application status
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: "up" | "down";
    cache: "up" | "down";
    proxmox: "up" | "down";
  };
  performance: {
    memoryUsage: number;
    cpuUsage: number;
  };
}

export async function GET() {
  try {
    const startTime = process.hrtime();
    
    // Basic health checks
    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: "up", // Would check actual database connection
        cache: "up",    // Would check cache service
        proxmox: "up",  // Would check Proxmox API connectivity
      },
      performance: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: 0, // Would calculate actual CPU usage
      },
    };

    // Check if any services are down
    const servicesDown = Object.values(healthStatus.services).filter(status => status === "down").length;
    
    if (servicesDown > 0) {
      healthStatus.status = servicesDown === Object.keys(healthStatus.services).length ? "unhealthy" : "degraded";
    }

    // Performance checks
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    // Add response time to performance metrics
    (healthStatus.performance as any).responseTime = responseTime;

    // Determine status code based on health
    const statusCode = healthStatus.status === "healthy" ? 200 : 
                      healthStatus.status === "degraded" ? 200 : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    console.error("Health check failed:", error);
    
    const errorStatus: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: "down",
        cache: "down",
        proxmox: "down",
      },
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
      },
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}

/**
 * HEAD request for simple health check
 */
export async function HEAD() {
  try {
    // Simple check - if we can respond, we're alive
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}