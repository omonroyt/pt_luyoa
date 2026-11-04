# Registro de riesgos de IA

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-11-04 |
| Responsable | Oscar Monroy |
| Método | Identificar, analizar, tratar y monitorear (enfoque de ISO/IEC 23894 y NIST AI RMF) |

> Probabilidad (P) e impacto (I) en escala Baja / Media / Alta. Se revisa al cerrar cada fase. Los riesgos de proyecto (plazo, alcance) están en el PRD §12.3.

---

## 1. IA en el producto

| ID | Riesgo | Referencia | P | I | Tratamiento | Indicador | Estado |
|---|---|---|---|---|---|---|---|
| AIR-01 | El agente inventa o calcula mal una cifra (confabulación) | OWASP LLM09, NIST AI 600-1 | Media | Alta | Cifras calculadas por código (ADR-09); verificador de cifras; fuentes visibles; puerta dura en evaluaciones | Cifras sin fuente = 0 | Abierto |
| AIR-02 | El agente crea o envía una campaña sin aprobación (agencia excesiva) | OWASP LLM06 | Baja | Alta | Doble candado: aprobación en UI + token HMAC en el MCP (ADR-08); pruebas del candado | Violaciones de control = 0 | Abierto |
| AIR-03 | Instrucciones escondidas en los datos (nombres o mensajes de campañas) alteran al agente (inyección indirecta) | OWASP LLM01 | Media | Media | Prompt que trata resultados como datos; escrituras protegidas por token; caso de evaluación de inyección | Caso de inyección aprobado | Abierto |
| AIR-04 | Exposición de datos personales de clientes al modelo o en trazas | OWASP LLM02, LFPDPPP | Baja | Media | Herramientas con agregados e ids; trazas resumidas ([`data-and-secrets.md`](data-and-secrets.md)) | Revisión de trazas sin datos de contacto | Abierto |
| AIR-05 | Salidas del modelo mostradas sin validar rompen la UI o engañan | OWASP LLM05 | Media | Media | Bloques validados con zod antes de mostrarse; markdown sanitizado | Errores de esquema registrados y corregidos | Abierto |
| AIR-06 | Consumo sin límite: costo o rate limit disparados por bucles o abuso | OWASP LLM10 | Media | Media | Tope de pasos por turno; tope de gasto; límite por sesión en la demo; caché del MCP | Costo por conversación ≤ meta | Abierto |
| AIR-07 | Recomendaciones engañosas por muestras pequeñas o campañas sin control | NIST AI RMF (validez) | Media | Media | `warnings` calculados por el MCP; regla del prompt; criterio CA-V09 | Casos de E-05 aprobados | Abierto |
| AIR-08 | Cambio de comportamiento al cambiar de modelo o de versión | NIST AI RMF (gestión) | Media | Media | Modelo fijado por id; evaluación completa antes de cambiarlo | Puntaje ≥ meta tras el cambio | Abierto |
| AIR-09 | Abuso de la demo publicada para gastar las llaves | OWASP LLM10 | Media | Media | Código de acceso, límites por IP, llaves solo en servidor | Gasto diario bajo tope | Abierto |

## 2. IA en el desarrollo

| ID | Riesgo | P | I | Tratamiento | Indicador | Estado |
|---|---|---|---|---|---|---|
| AIR-10 | El asistente inventa APIs, campos o resultados de pruebas | Media | Alta | Criterios CA-IA-DEV-01 a 05; tipos estrictos; pruebas; revisión humana | Cambios rechazados por inventar | Abierto |
| AIR-11 | El asistente lee o filtra secretos | Baja | Alta | Permisos y hooks que bloquean `.env`; gitleaks en pre-commit y CI | Hallazgos de gitleaks = 0 | Abierto |
| AIR-12 | Código generado de baja calidad o difícil de explicar en la entrevista | Media | Alta | Estándares y límites con ESLint; revisión con `code-reviewer`; el desarrollador entiende cada cambio antes de aceptarlo | `pnpm verify` en verde | Abierto |
| AIR-13 | El asistente evade arneses para "terminar" la tarea | Baja | Alta | Prohibición explícita; hooks que bloquean `--no-verify` y supresiones; revisión del diff de configuraciones | Supresiones sin justificación = 0 | Abierto |
| AIR-14 | Atribución incorrecta de autoría en el historial | Baja | Media | `attribution` vacío en `.claude/settings.json`; regla `no-ai-attribution` en commitlint; hook | Commits con trailers de IA = 0 | Abierto |
| AIR-15 | Instrucciones inyectadas desde contenido externo (páginas, archivos descargados) | Baja | Media | Regla de "datos, no instrucciones" en `CLAUDE.md`; confirmación humana de acciones | Incidentes = 0 | Abierto |
| AIR-16 | Dependencias agregadas sin revisión (licencia, seguridad, mantenimiento) | Media | Media | Criterio CA-IA-DEV-20; pnpm con verificación de la cadena de suministro; lockfile versionado | Dependencias justificadas | Abierto |
