# Política de gobernanza de IA

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-11-04 |
| Responsable | Oscar Monroy (desarrollador responsable) |
| Revisión | Al cerrar cada fase del proyecto o ante un incidente |

> **Aclaración:** este proyecto **no está certificado** en ninguna norma. La política adopta de forma voluntaria prácticas de los marcos citados en la sección 4, a una escala proporcional a un proyecto de una persona y una semana. Las referencias a normas indican de dónde viene cada práctica, no un cumplimiento auditado.

---

## 1. Alcance

Esta política cubre **dos sistemas de IA**:

| Sistema | Qué es | Riesgo principal |
|---|---|---|
| **IA en el desarrollo** | Claude Code y otros asistentes que ayudan a escribir código, pruebas y documentación | Código o documentación incorrectos, inventados o inseguros que lleguen al repositorio |
| **IA en el producto** | El agente del copiloto de Café Alborada, que responde con datos y propone y envía campañas | Cifras inventadas, recomendaciones dañinas, acciones sin aprobación, exposición de datos |

## 2. Principios

| Principio | Qué significa aquí |
|---|---|
| **Responsabilidad humana** | Oscar Monroy decide, revisa y firma todo. La IA propone; la persona dispone. Ningún resultado de IA se integra sin revisión humana |
| **Veracidad** | Ni el asistente de desarrollo ni el agente del producto inventan información. Lo que no está verificado se declara como tal |
| **Supervisión humana** | Las acciones con efecto (commits, push, crear o enviar campañas) requieren una instrucción o aprobación humana explícita |
| **Trazabilidad** | Cada cifra del producto tiene fuente; cada cambio del repositorio tiene un commit convencional, un responsable y un requisito al que responde |
| **Privacidad y seguridad** | Mínimo acceso a datos; secretos fuera del alcance de la IA; datos de clientes tratados como personales aunque sean ficticios |
| **Transparencia** | Se documenta cómo se usa la IA (este documento y `.claude/`), qué modelo usa el producto y por qué |
| **Proporcionalidad** | Controles del tamaño del riesgo: fuertes donde hay daño posible (dinero, datos, envíos), ligeros donde no |

## 3. Roles y responsabilidades

| Actividad | Desarrollador responsable | Asistente de IA (desarrollo) | Agente (producto) | Dueña del negocio (usuaria) |
|---|---|---|---|---|
| Definir alcance y requisitos | Decide | Propone y señala huecos | — | — |
| Escribir código y documentación | Revisa y aprueba | Redacta bajo los estándares | — | — |
| Commit, push, PR | Ejecuta u ordena | Prepara solo si se le pide | — | — |
| Elegir modelo del producto | Decide con la comparación medida | Ejecuta las mediciones | — | — |
| Responder preguntas de negocio | Diseña y evalúa | — | Responde con datos y fuentes | Pregunta |
| Crear y enviar campañas | Diseña el candado | — | Propone y pide aprobación | **Aprueba o rechaza** |
| Gestionar incidentes | Decide y comunica | Ayuda a diagnosticar | — | Se le informa |

## 4. Marcos de referencia y cómo se aplican

### 4.1 ISO/IEC 42001:2023 — Sistema de gestión de IA

Norma de sistemas de gestión para organizaciones que desarrollan o usan IA. Se toman los objetivos de control de su Anexo A como lista de verificación:

| Área del Anexo A | Práctica en este proyecto | Evidencia |
|---|---|---|
| Políticas relacionadas con la IA | Esta política y `CLAUDE.md` | `docs/governance/`, `CLAUDE.md` |
| Organización interna | Roles de la sección 3; un único responsable | Sección 3 |
| Recursos para los sistemas de IA | Modelos, datos, herramientas y personas documentados | `04_DECISIONES_TECNICAS.md`, sección 6 |
| Evaluación de impactos de los sistemas de IA | Evaluación de impacto de la sección 5 | Sección 5 |
| Ciclo de vida del sistema de IA | Requisitos → diseño → construcción → verificación → despliegue → operación, con criterios de aceptación por fase | `docs/specs/`, sección 7 |
| Datos para los sistemas de IA | Clasificación, minimización y procedencia de los datos | [`data-and-secrets.md`](data-and-secrets.md) |
| Información para las partes interesadas | README, documento de decisiones, fuentes visibles en cada respuesta | README, D-03, B-06 |
| Uso de los sistemas de IA | Uso previsto y límites del agente; lo que no sabe | `06_DISENO_AGENTE.md` §9 |
| Relaciones con terceros | Proveedores: OpenRouter y los modelos que enruta, API de Luyoa, Vercel, Turso | Sección 6 |

### 4.2 Otros marcos

| Marco | Qué aporta | Dónde se aplica |
|---|---|---|
| **ISO/IEC 23894:2023** — Gestión de riesgos de IA | Identificar, analizar, tratar y monitorear riesgos propios de la IA | [`ai-risk-register.md`](ai-risk-register.md) |
| **ISO/IEC 42005:2025** — Evaluación de impacto de sistemas de IA | Analizar efectos sobre personas y grupos antes de desplegar | Sección 5 |
| **ISO/IEC 38507:2022** — Gobernanza del uso de IA en organizaciones | Responsabilidad del órgano de gobierno sobre decisiones con IA | Secciones 2 y 3 |
| **ISO/IEC 22989:2022** — Conceptos y terminología de IA | Vocabulario común (agente, modelo, sistema de IA) | Glosario del PRD |
| **ISO/IEC 5338:2023** — Procesos del ciclo de vida de sistemas de IA | Etapas y controles del ciclo de vida | Sección 7 |
| **ISO/IEC 25059:2023** — Modelo de calidad para sistemas de IA | Atributos de calidad (exactitud, robustez, controlabilidad, transparencia) | `08_PLAN_EVALUACION.md` |
| **NIST AI RMF 1.0** y su perfil de IA generativa (**NIST AI 600-1**) | Funciones Gobernar, Mapear, Medir y Gestionar; riesgos de confabulación y de seguridad de la información | Secciones 4 a 8 |
| **OWASP Top 10 para aplicaciones con LLM (2025)** | Riesgos de seguridad de LLM: inyección de prompt, divulgación de información sensible, manejo inseguro de salidas, agencia excesiva, desinformación, consumo sin límite | [`ai-risk-register.md`](ai-risk-register.md) |
| **Buenas prácticas de seguridad de la especificación MCP** | Autenticación del servidor, confirmación humana en acciones, mínimo privilegio en herramientas | ADR-04, ADR-08 |
| **LFPDPPP (México, 2025)** — Ley Federal de Protección de Datos Personales en Posesión de los Particulares | Licitud, consentimiento, finalidad y minimización en el tratamiento de datos personales | [`data-and-secrets.md`](data-and-secrets.md); el consentimiento por canal se respeta con `reachable` |

## 5. Evaluación de impacto (producto)

| Parte afectada | Posible impacto | Severidad | Control |
|---|---|---|---|
| Dueña del negocio | Decide con una cifra incorrecta o inventada | Alta | Cifras calculadas por código, fuentes visibles, verificador de cifras, evaluaciones con puertas duras (ADR-09, B-01) |
| Dueña del negocio | Pierde margen por una oferta mal calculada | Media | Costo de la oferta y efecto en margen en cada tarjeta (B-04) |
| Clientes del café | Reciben mensajes sin haber dado consentimiento | Alta | Solo se cuenta y se envía a `reachable`, que excluye a quienes no consintieron (T-04) |
| Clientes del café | Exposición de sus datos personales al modelo o en registros | Media | Minimización: el agente trabaja con agregados e ids; nada de datos de contacto al modelo ni a las trazas |
| Clientes del café | Saturación por campañas repetidas | Baja | Envío solo con aprobación; historial de campañas visible antes de proponer |
| Luyoa (evaluador) | Exposición o abuso de las llaves en la demo publicada | Media | Llaves solo en servidor, código de acceso, topes de uso y de gasto |

Uso previsto: apoyo a decisiones de una persona dueña de un negocio pequeño, con un humano siempre en el circuito de las acciones. **Fuera del uso previsto:** decisiones automáticas sin revisión, envío masivo sin aprobación, perfilado individual de clientes.

## 6. Proveedores y recursos

| Recurso | Proveedor | Datos que recibe | Control |
|---|---|---|---|
| Modelos de lenguaje | OpenRouter y los proveedores que enruta | Prompt del sistema, preguntas de la usuaria, resultados agregados de herramientas | Minimización; límite de gasto de la llave; modelo fijado por versión |
| Datos del negocio | API de Luyoa (datos ficticios) | Llave de API | Llave en entorno del servidor |
| Hosting | Vercel | Código y variables de entorno cifradas | Sin llaves en el código |
| Base de datos | Turso / SQLite | Conversaciones, trazas, preferencias, aprobaciones | Sin secretos ni datos de contacto |
| Asistente de desarrollo | Claude Code | Código del repositorio | Sin acceso a `.env` (permisos y hooks); revisión humana |

## 7. Ciclo de vida y controles por fase

| Fase | Control | Criterio para avanzar |
|---|---|---|
| Requisitos | Contexto, PRD y criterios de aceptación trazables | Cada requisito `R-` tiene criterios `CA-` |
| Diseño | Arquitectura, ADR, evaluación de impacto y registro de riesgos | Cada riesgo alto tiene control |
| Construcción | Estándares de código, arneses, revisión humana de todo cambio asistido por IA | `pnpm verify` en verde |
| Verificación | Pruebas, evaluaciones con puertas duras, comparación de modelos | Metas de `08_PLAN_EVALUACION.md` §4.4 |
| Despliegue | Llaves en entorno, protección de la demo, CI en verde | Lista de entrega completa |
| Operación | Trazas, costo por conversación, revisión de incidentes | Sin incidentes abiertos de severidad alta |

## 8. Uso de IA en el desarrollo

1. **Contexto controlado:** el asistente trabaja con `CLAUDE.md`, los `CLAUDE.md` por capa y la documentación de `docs/`. Lo que no esté ahí o en el código, lo pregunta.
2. **Mínimo privilegio:** sin acceso a secretos; acciones irreversibles (push, publicar, borrar) solo con instrucción explícita.
3. **Revisión humana obligatoria:** todo cambio asistido por IA se revisa antes del commit; el desarrollador responde por él.
4. **Criterios de aceptación propios:** [`ai-acceptance-criteria.md`](ai-acceptance-criteria.md).
5. **Arneses automáticos:** hooks y permisos de Claude Code, git hooks, ESLint, verificador de comentarios y CI.
6. **Autoría:** el trabajo se firma por el desarrollador responsable; las herramientas no figuran como autoras ([`git-workflow.md`](../standards/git-workflow.md) §1).

## 9. Incidentes

| Incidente | Respuesta inmediata | Después |
|---|---|---|
| Llave expuesta (repositorio, registro, chat) | Generar una llave nueva en el portal de Luyoa (invalida la anterior); revisar el gasto de OpenRouter | Purgar el historial si llegó a git; agregar el patrón a gitleaks; registrar en el registro de riesgos |
| El agente afirma una cifra sin fuente | Agregar el caso al set de evaluación | Corregir herramienta o prompt hasta pasar la puerta dura |
| Envío de campaña sin aprobación (aunque sea simulado) | Detener la demo; revisar trazas | Prueba de regresión del candado; análisis de causa |
| Contenido inyectado en los datos que altera al agente | Registrar el texto y la traza | Reforzar el tratamiento de datos como datos; caso de evaluación |

## 10. Revisión de esta política

Se revisa al cerrar cada fase (documentación, MCP, agente, interfaz, evaluaciones, entrega) y tras cualquier incidente. Los cambios se registran con commits `docs(governance)`.
