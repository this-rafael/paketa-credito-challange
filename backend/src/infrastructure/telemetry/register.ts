/**
 * @packageDocumentation
 *
 * Side-effect entry used via `node --import` / `tsx --import` so the SDK patches
 * Node modules before the application graph loads.
 */
import { startTelemetry } from './start-telemetry.js';

startTelemetry();
