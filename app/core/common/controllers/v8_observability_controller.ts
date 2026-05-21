import type { HttpContext } from '@adonisjs/core/http'

import fs from 'node:fs'
import inspector from 'node:inspector'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import path from 'node:path'
import process from 'node:process'
import v8 from 'node:v8'

import env from '#start/env'
import app from '@adonisjs/core/services/app'

// Start event loop delay tracking on import
const histogram = monitorEventLoopDelay({ resolution: 20 })
histogram.enable()

export default class V8ObservabilityController {
  /**
   * Helper to verify safety token in non-development environments.
   * Returns true if authorized, false otherwise.
   */
  private isAuthorized(request: HttpContext['request']): boolean {
    const nodeEnv = env.get('NODE_ENV')
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return true
    }

    const expectedToken = env.get('OBSERVABILITY_TOKEN')
    if (!expectedToken) {
      // In production, if no token is configured, fail closed.
      return false
    }

    const authHeader = request.header('X-Observability-Token') || request.header('Authorization')
    if (!authHeader) {
      return false
    }

    // Support both header types (direct token or Bearer token)
    const token = authHeader.replace(/^Bearer\s+/i, '')
    return token === expectedToken
  }

  /**
   * GET /health/v8
   * Returns application-level metrics, V8 heap statistics, active handles and event loop lag.
   */
  async index({ request, response }: HttpContext) {
    if (!this.isAuthorized(request)) {
      return response.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Observability-Token header',
      })
    }

    // Process uptime and Node info
    const uptime = process.uptime()
    const nodeVersion = process.version
    const platform = process.platform
    const arch = process.arch

    // Memory usage (process level)
    const memoryUsage = process.memoryUsage()

    // CPU Usage
    const cpuUsage = process.cpuUsage()

    // V8 statistics
    const heapStats = v8.getHeapStatistics()
    const heapSpaceStats = v8.getHeapSpaceStatistics()
    const heapCodeStats = v8.getHeapCodeStatistics()

    // Active handles analysis to discover connection leaks, unresolved promises or timers
    const activeHandles = (process as any)._getActiveHandles
      ? (process as any)._getActiveHandles()
      : []
    const activeRequests = (process as any)._getActiveRequests
      ? (process as any)._getActiveRequests()
      : []

    const handleCounts: Record<string, number> = {}
    for (const handle of activeHandles) {
      const type = handle?.constructor?.name || 'Unknown'
      handleCounts[type] = (handleCounts[type] || 0) + 1
    }

    // Event loop latency metrics (in milliseconds)
    const eventLoopLag = {
      min: histogram.min / 1e6,
      max: histogram.max / 1e6,
      mean: histogram.mean / 1e6,
      stddev: histogram.stddev / 1e6,
      p50: histogram.percentile(50) / 1e6,
      p95: histogram.percentile(95) / 1e6,
      p99: histogram.percentile(99) / 1e6,
    }

    // Reset histogram for the next interval to show fresh lag statistics
    histogram.reset()

    return response.ok({
      meta: {
        uptime,
        nodeVersion,
        platform,
        arch,
        pid: process.pid,
      },
      process: {
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers || 0,
        },
        handles: {
          total: activeHandles.length + activeRequests.length,
          handlesCount: activeHandles.length,
          requestsCount: activeRequests.length,
          types: handleCounts,
        },
      },
      v8: {
        heap: {
          totalHeapSize: heapStats.total_heap_size,
          totalHeapExecutableSize: heapStats.total_heap_size_executable,
          totalPhysicalSize: heapStats.total_physical_size,
          totalAvailableSize: heapStats.total_available_size,
          usedHeapSize: heapStats.used_heap_size,
          heapSizeLimit: heapStats.heap_size_limit,
          mallocedMemory: heapStats.malloced_memory,
          peakMallocedMemory: heapStats.peak_malloced_memory,
          doesZapGarbage: heapStats.does_zap_garbage,
          nativeContexts: heapStats.number_of_native_contexts,
          detachedContexts: heapStats.number_of_detached_contexts,
        },
        code: {
          codeAndMetadataSize: heapCodeStats.code_and_metadata_size,
          bytecodeAndMetadataSize: heapCodeStats.bytecode_and_metadata_size,
          externalScriptSourceSize: heapCodeStats.external_script_source_size,
        },
        spaces: heapSpaceStats.map((space) => ({
          name: space.space_name,
          size: space.space_size,
          used: space.space_used_size,
          available: space.space_available_size,
          physicalSize: space.physical_space_size,
        })),
      },
      eventLoop: {
        latencyMs: eventLoopLag,
      },
    })
  }

  /**
   * POST /health/v8/gc
   * Triggers manual Garbage Collection. Requires Node to be started with --expose-gc.
   */
  async gc({ request, response }: HttpContext) {
    if (!this.isAuthorized(request)) {
      return response.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Observability-Token header',
      })
    }

    if (typeof global.gc !== 'function') {
      return response.status(400).json({
        error: 'GC Expose Disabled',
        message: 'Garbage Collection exposure is not enabled. Node.js must be run with the --expose-gc flag.',
      })
    }

    const beforeMemory = process.memoryUsage().heapUsed
    
    // Run Garbage Collection
    global.gc()
    
    const afterMemory = process.memoryUsage().heapUsed
    const reclaimed = beforeMemory - afterMemory

    return response.ok({
      status: 'success',
      message: 'Garbage collection triggered successfully',
      stats: {
        beforeHeapUsed: beforeMemory,
        afterHeapUsed: afterMemory,
        reclaimedBytes: reclaimed,
        reclaimedMb: parseFloat((reclaimed / 1024 / 1024).toFixed(3)),
      },
    })
  }

  /**
   * POST /health/v8/heap-snapshot
   * Writes a V8 heap snapshot to the tmp/diagnostics directory.
   */
  async heapSnapshot({ request, response }: HttpContext) {
    if (!this.isAuthorized(request)) {
      return response.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Observability-Token header',
      })
    }

    try {
      const diagnosticsDir = app.tmpPath('diagnostics')
      if (!fs.existsSync(diagnosticsDir)) {
        fs.mkdirSync(diagnosticsDir, { recursive: true })
      }

      const filename = `heap-${Date.now()}.heapsnapshot`
      const filePath = path.join(diagnosticsDir, filename)

      // v8.writeHeapSnapshot blocks the thread while writing the snapshot.
      // This is expected and acceptable for a dedicated diagnostic action.
      const writtenPath = v8.writeHeapSnapshot(filePath)

      // Get file info
      const stats = fs.statSync(writtenPath)

      return response.ok({
        status: 'success',
        message: 'Heap snapshot generated successfully',
        data: {
          filename,
          filePath: writtenPath,
          sizeBytes: stats.size,
          sizeMb: parseFloat((stats.size / 1024 / 1024).toFixed(2)),
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to write heap snapshot',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * POST /health/v8/cpu-profile
   * Records a Node CPU Profile using inspector for a given duration.
   */
  async cpuProfile({ request, response }: HttpContext) {
    if (!this.isAuthorized(request)) {
      return response.status(403).json({
        error: 'Unauthorized',
        message: 'Invalid or missing X-Observability-Token header',
      })
    }

    const duration = request.input('duration', 5000) // Default to 5 seconds
    if (typeof duration !== 'number' || duration <= 0 || duration > 60000) {
      return response.status(400).json({
        error: 'Invalid parameter',
        message: 'Duration must be a positive integer representing milliseconds (max 60000)',
      })
    }

    const diagnosticsDir = app.tmpPath('diagnostics')
    if (!fs.existsSync(diagnosticsDir)) {
      fs.mkdirSync(diagnosticsDir, { recursive: true })
    }

    const filename = `profile-${Date.now()}.cpuprofile`
    const filePath = path.join(diagnosticsDir, filename)

    try {
      const session = new inspector.Session()
      session.connect()

      const recordPromise = new Promise<void>((resolve, reject) => {
        session.post('Profiler.enable', (err1) => {
          if (err1) return reject(err1)
          
          session.post('Profiler.start', (err2) => {
            if (err2) return reject(err2)
            
            setTimeout(() => {
              session.post('Profiler.stop', (err3, params) => {
                if (err3) return reject(err3)
                
                try {
                  if (params && params.profile) {
                    fs.writeFileSync(filePath, JSON.stringify(params.profile))
                    session.post('Profiler.disable')
                    session.disconnect()
                    resolve()
                  } else {
                    reject(new Error('Profiler returned empty profile'))
                  }
                } catch (e) {
                  reject(e)
                }
              })
            }, duration)
          })
        })
      })

      await recordPromise
      const stats = fs.statSync(filePath)

      return response.ok({
        status: 'success',
        message: `CPU profile recorded for ${duration / 1000} seconds`,
        data: {
          filename,
          filePath,
          durationMs: duration,
          sizeBytes: stats.size,
          sizeKb: parseFloat((stats.size / 1024).toFixed(2)),
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to record CPU profile',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
