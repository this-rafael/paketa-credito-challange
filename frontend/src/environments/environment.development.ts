export const environment = {
  production: false,
  apiBaseUrl: '',
  otelEnabled: true,
  otelServiceName: 'menu-studio',
  /** Dev-server proxy rewrites `/otlp` → Collector `:4318`. */
  otelExporterOtlpEndpoint: '/otlp',
};
