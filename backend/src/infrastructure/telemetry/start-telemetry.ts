/**
 * @packageDocumentation
 *
 * Boots the OpenTelemetry Node SDK (traces + metrics) when `OTEL_ENABLED` is
 * true. Must run before Express/Mongoose modules are loaded so auto
 * instrumentation can patch them.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/** Shared SDK handle used by {@link shutdownTelemetry}. */
let sdk: NodeSDK | undefined;

/**
 * Resolves `service.version` from the backend `package.json`.
 *
 * @returns The package version string, or `0.0.0` when unreadable.
 */
function readServiceVersion(): string {
  try {
    const packageJsonPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../package.json',
    );
    const raw = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      version?: string;
    };
    return raw.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Whether OpenTelemetry should start for this process.
 *
 * Disabled under Vitest by default, and when `OTEL_ENABLED` is `false`/`0`.
 *
 * @param source - Environment map; defaults to `process.env`.
 * @returns `true` when the SDK should start.
 */
export function isOtelEnabled(
  source: Record<string, string | undefined> = process.env,
): boolean {
  if (source['VITEST']) {
    return source['OTEL_ENABLED'] === 'true' || source['OTEL_ENABLED'] === '1';
  }
  const raw = source['OTEL_ENABLED'];
  if (raw === undefined) {
    return true;
  }
  return raw === 'true' || raw === '1';
}

/**
 * Starts the OpenTelemetry SDK once. Subsequent calls are no-ops.
 *
 * @param source - Environment map; defaults to `process.env`.
 */
export function startTelemetry(
  source: Record<string, string | undefined> = process.env,
): void {
  if (sdk || !isOtelEnabled(source)) {
    return;
  }

  const serviceName = source['OTEL_SERVICE_NAME']?.trim() || 'menu-api';
  const otlpEndpoint = (
    source['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://127.0.0.1:4318'
  ).replace(/\/$/, '');

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: readServiceVersion(),
    'deployment.environment': source['NODE_ENV'] ?? 'development',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${otlpEndpoint}/v1/metrics`,
        }),
        exportIntervalMillis: 10_000,
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

/**
 * Flushes and shuts down the SDK when it was started.
 *
 * @returns A promise that resolves after shutdown (or immediately if inactive).
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }
  const active = sdk;
  sdk = undefined;
  await active.shutdown();
}
