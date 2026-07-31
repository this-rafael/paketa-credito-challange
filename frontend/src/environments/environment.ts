export const environment = {
  production: true,
  apiBaseUrl: '',
  otelEnabled: true,
  otelServiceName: 'menu-studio',
  /** Relative path proxied by nginx to the OTel Collector. */
  otelExporterOtlpEndpoint: '/otlp',
};
