# 🎾 Polla Roland Garros 2026

Bracket Challenge para Roland Garros 2026 — ATP & WTA (128 jugadores cada cuadro).

Desarrollado con **Google Apps Script** (backend) + **Google Sheets** (base de datos) + **Tailwind CSS** (UI).

## Archivos

| Archivo | Descripción |
|---|---|
| `Código.gs` | Backend GAS: doGet, leer partidos, guardar pronósticos, recalcular puntajes, ranking |
| `Index.html` | Frontend SPA: registro, switch ATP/WTA, tabs por ronda, tarjetas de partidos, ranking |

## Estructura esperada en Google Sheets

### Pestaña `Partidos_ATP` y `Partidos_WTA`
| Partido_ID | Ronda | Jugador1 | Seed1 | Jugador2 | Seed2 | Ganador_Real |
|---|---|---|---|---|---|---|
| ATP_001 | R128 | Novak Djokovic | 1 | Qualifier | — | — |

### Pestaña `Pronosticos` (auto-creada)
| Email | Username | Cuadro | Partido_ID | Ronda | Jugador_Elegido | Timestamp |

### Pestaña `Ranking` (auto-creada por `recalcularPuntajes()`)
| Posición | Username | Email | Puntos |

### Pestaña `Usuarios` (auto-creada)
| Email | Username | Fecha_Registro |

## Puntaje por ronda

| Ronda | Puntos |
|---|---|
| R128 | 1 |
| R64 | 2 |
| R32 | 3 |
| R16 (Octavos) | 5 |
| QF (Cuartos) | 8 |
| SF (Semis) | 13 |
| F (Final) | 21 |

## Cómo desplegar

1. Abre [Google Apps Script](https://script.google.com) → Nuevo proyecto.
2. Copia el contenido de `Código.gs` en el editor.
3. Crea un archivo HTML llamado `Index` y pega el contenido de `Index.html`.
4. En `Código.gs`, reemplaza `SS_ID` con el ID de tu Google Sheet.
5. Despliega como **Web App** → Ejecutar como: *Tú* → Acceso: *Cualquiera*.
6. Copia la URL generada y compártela con los participantes.

## Función `recalcularPuntajes()`

Ejecútala manualmente desde el editor GAS (o crea un trigger diario) cada vez que se registren resultados reales en la columna `Ganador_Real` de las pestañas de partidos.
