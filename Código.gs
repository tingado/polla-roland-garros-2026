// ============================================================
// Polla Roland Garros 2026 — Google Apps Script Backend
// ============================================================

var SS_ID = ''; // <-- Reemplaza con el ID de tu Google Sheet

function getSpreadsheet() {
  return SpreadsheetApp.openById(SS_ID);
}

// ------------------------------------------------------------
// 1. Punto de entrada Web App
// ------------------------------------------------------------
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Polla Roland Garros 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Utilidad para incluir archivos HTML parciales
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ------------------------------------------------------------
// 2. Leer partidos desde las pestañas
// ------------------------------------------------------------
function getPartidos(cuadro) {
  try {
    var ss = getSpreadsheet();
    var sheetName = cuadro === 'WTA' ? 'Partidos_WTA' : 'Partidos_ATP';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Pestaña no encontrada: ' + sheetName);

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var partidos = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // saltar filas vacías
      var partido = {};
      headers.forEach(function(h, idx) {
        partido[h] = row[idx];
      });
      partidos.push(partido);
    }
    return JSON.stringify({ success: true, data: partidos });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------
// 3. Guardar / actualizar pronóstico
//    Columnas esperadas en "Pronosticos":
//    Email | Username | Cuadro | Partido_ID | Ronda | Jugador_Elegido | Timestamp
// ------------------------------------------------------------
function guardarPronostico(email, username, cuadro, partidoId, ronda, jugadorElegido) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Pronosticos');
    if (!sheet) {
      sheet = ss.insertSheet('Pronosticos');
      sheet.appendRow(['Email', 'Username', 'Cuadro', 'Partido_ID', 'Ronda', 'Jugador_Elegido', 'Timestamp']);
    }

    var data = sheet.getDataRange().getValues();
    var now = new Date();

    // Buscar si ya existe un pronóstico para este email + partido
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === email && data[i][3] === partidoId && data[i][2] === cuadro) {
        // Actualizar fila existente
        sheet.getRange(i + 1, 6).setValue(jugadorElegido);
        sheet.getRange(i + 1, 7).setValue(now);
        return JSON.stringify({ success: true, action: 'updated' });
      }
    }

    // Nueva fila
    sheet.appendRow([email, username, cuadro, partidoId, ronda, jugadorElegido, now]);
    return JSON.stringify({ success: true, action: 'created' });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------
// 4. Obtener pronósticos previos de un usuario
// ------------------------------------------------------------
function getPronosticosUsuario(email) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Pronosticos');
    if (!sheet) return JSON.stringify({ success: true, data: [] });

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var resultados = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = data[i][idx]; });
        resultados.push(obj);
      }
    }
    return JSON.stringify({ success: true, data: resultados });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------
// 5. Recalcular puntajes
//    Puntos por ronda: R128=1, R64=2, R32=3, R16=5, QF=8, SF=13, F=21
// ------------------------------------------------------------
var PUNTOS_RONDA = {
  'R128': 1, 'R64': 2, 'R32': 3, 'R16': 5, 'QF': 8, 'SF': 13, 'F': 21
};

function recalcularPuntajes() {
  try {
    var ss = getSpreadsheet();
    var sheetPron = ss.getSheetByName('Pronosticos');
    if (!sheetPron) return JSON.stringify({ success: false, error: 'No existe la pestaña Pronosticos' });

    var pronData = sheetPron.getDataRange().getValues();
    var pronHeaders = pronData[0];

    // Construir mapa de ganadores reales desde ambas pestañas de partidos
    var ganadoresReales = {}; // { 'ATP_PartidoID': 'Ganador', 'WTA_PartidoID': 'Ganador' }

    ['ATP', 'WTA'].forEach(function(cuadro) {
      var shName = 'Partidos_' + cuadro;
      var sh = ss.getSheetByName(shName);
      if (!sh) return;
      var d = sh.getDataRange().getValues();
      var h = d[0];
      var idxId = h.indexOf('Partido_ID');
      var idxGanador = h.indexOf('Ganador_Real');
      if (idxId === -1 || idxGanador === -1) return;
      for (var i = 1; i < d.length; i++) {
        if (d[i][idxId]) {
          ganadoresReales[cuadro + '_' + d[i][idxId]] = d[i][idxGanador];
        }
      }
    });

    // Acumular puntajes por usuario
    var ranking = {}; // { email: { username, puntos } }
    var idxEmail = pronHeaders.indexOf('Email');
    var idxUser = pronHeaders.indexOf('Username');
    var idxCuadro = pronHeaders.indexOf('Cuadro');
    var idxPartido = pronHeaders.indexOf('Partido_ID');
    var idxRonda = pronHeaders.indexOf('Ronda');
    var idxElegido = pronHeaders.indexOf('Jugador_Elegido');

    for (var i = 1; i < pronData.length; i++) {
      var row = pronData[i];
      var email = row[idxEmail];
      var username = row[idxUser];
      var cuadro = row[idxCuadro];
      var partidoId = row[idxPartido];
      var ronda = row[idxRonda];
      var elegido = row[idxElegido];
      var key = cuadro + '_' + partidoId;
      var ganadorReal = ganadoresReales[key] || '';

      if (!ranking[email]) ranking[email] = { username: username, puntos: 0 };
      if (ganadorReal && elegido === ganadorReal) {
        ranking[email].puntos += (PUNTOS_RONDA[ronda] || 0);
      }
    }

    // Escribir en pestaña Ranking
    var shRanking = ss.getSheetByName('Ranking');
    if (!shRanking) {
      shRanking = ss.insertSheet('Ranking');
    }
    shRanking.clearContents();
    shRanking.appendRow(['Posición', 'Username', 'Email', 'Puntos']);

    var sorted = Object.keys(ranking).map(function(e) {
      return { email: e, username: ranking[e].username, puntos: ranking[e].puntos };
    }).sort(function(a, b) { return b.puntos - a.puntos; });

    sorted.forEach(function(u, idx) {
      shRanking.appendRow([idx + 1, u.username, u.email, u.puntos]);
    });

    return JSON.stringify({ success: true, data: sorted });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------
// 6. Obtener ranking actual
// ------------------------------------------------------------
function getRanking() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Ranking');
    if (!sheet) return JSON.stringify({ success: true, data: [] });

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var resultado = [];

    for (var i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      var obj = {};
      headers.forEach(function(h, idx) { obj[h] = data[i][idx]; });
      resultado.push(obj);
    }
    return JSON.stringify({ success: true, data: resultado });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}

// ------------------------------------------------------------
// 7. Registrar / validar usuario
// ------------------------------------------------------------
function registrarUsuario(email, username) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Usuarios');
    if (!sheet) {
      sheet = ss.insertSheet('Usuarios');
      sheet.appendRow(['Email', 'Username', 'Fecha_Registro']);
    }
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        return JSON.stringify({ success: true, action: 'existing', username: data[i][1] });
      }
    }
    sheet.appendRow([email, username, new Date()]);
    return JSON.stringify({ success: true, action: 'registered' });
  } catch (err) {
    return JSON.stringify({ success: false, error: err.message });
  }
}
