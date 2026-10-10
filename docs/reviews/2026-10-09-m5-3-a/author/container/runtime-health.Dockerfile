# Repair only the standalone probe; reuse the already compiled runtime byte-for-byte.
FROM detuned-m53-owned:runtime
COPY scripts/integrations/deployment/container-health.mjs /app/scripts/integrations/deployment/container-health.mjs
