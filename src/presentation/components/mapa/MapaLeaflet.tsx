import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { spacing } from '@/constants/theme';
import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import { useUIStyles } from '@/presentation/styles/uiStyles';

export interface PontoNoMapa {
  latitude: number;
  longitude: number;
}

export interface MapaLeafletRef {
  /** Move o pin para o ponto e centraliza o mapa nele. */
  centralizar(ponto: PontoNoMapa): void;
}

const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';
/** Origem da página: vira o Referer dos pedidos de blocos (política de uso do OSM). */
const ORIGEM_DA_PAGINA = 'https://ate.app/';

const numero = (valor: number) => JSON.stringify(Number(valor));
const pontoJs = (p: PontoNoMapa) => `${numero(p.latitude)},${numero(p.longitude)}`;

/**
 * Página com Leaflet e blocos do OpenStreetMap. Toque no mapa e arrasto do pin são enviados
 * ao app por postMessage ({ tipo: 'pin', latitude, longitude }); sem Leaflet (sem internet),
 * a página avisa com { tipo: 'erro' }.
 */
export function htmlDoMapa(centro: PontoNoMapa, zoom: number, pin: PontoNoMapa | null): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${LEAFLET}/leaflet.css">
<style>html,body,#mapa{height:100%;margin:0;padding:0}</style>
</head><body>
<div id="mapa"></div>
<script src="${LEAFLET}/leaflet.js"></script>
<script>
(function () {
  function enviar(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  if (!window.L) { enviar({tipo:'erro'}); return; }
  var mapa = L.map('mapa').setView([${pontoJs(centro)}],${numero(zoom)});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
  var pin = null;
  function colocarPin(lat, lng, centralizar) {
    if (!pin) {
      pin = L.marker([lat, lng], {draggable: true}).addTo(mapa);
      pin.on('dragend', function () {
        var p = pin.getLatLng().wrap();
        enviar({tipo:'pin', latitude: p.lat, longitude: p.lng});
      });
    } else {
      pin.setLatLng([lat, lng]);
    }
    if (centralizar) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 16));
  }
  mapa.on('click', function (e) {
    var p = e.latlng.wrap();
    colocarPin(p.lat, p.lng, false);
    enviar({tipo:'pin', latitude: p.lat, longitude: p.lng});
  });
  window.ate = {colocarPin: colocarPin};
  ${pin ? `colocarPin(${pontoJs(pin)},false);` : ''}
})();
</script>
</body></html>`;
}

function lerMensagem(evento: WebViewMessageEvent): { tipo: 'pin'; ponto: PontoNoMapa } | { tipo: 'erro' } | null {
  try {
    const dados = JSON.parse(evento.nativeEvent.data) as { tipo?: unknown; latitude?: unknown; longitude?: unknown };
    if (dados.tipo === 'erro') return { tipo: 'erro' };
    if (
      dados.tipo === 'pin' &&
      typeof dados.latitude === 'number' &&
      typeof dados.longitude === 'number' &&
      Coordenada.validar(dados.latitude, dados.longitude)
    ) {
      return { tipo: 'pin', ponto: { latitude: dados.latitude, longitude: dados.longitude } };
    }
  } catch {
    // Mensagem que não é JSON: ignorada.
  }
  return null;
}

/**
 * Mapa Leaflet + OpenStreetMap numa WebView: roda no Expo Go e no APK sem chave de API. O
 * HTML é montado uma vez com o estado inicial; depois, o app só envia comandos à página.
 */
export const MapaLeaflet = forwardRef<
  MapaLeafletRef,
  {
    centroInicial: PontoNoMapa;
    zoomInicial: number;
    pinInicial: PontoNoMapa | null;
    onEscolher(ponto: PontoNoMapa): void;
  }
>(function MapaLeaflet({ centroInicial, zoomInicial, pinInicial, onEscolher }, ref) {
  const uiStyles = useUIStyles();
  const webview = useRef<WebView>(null);
  const [html] = useState(() => htmlDoMapa(centroInicial, zoomInicial, pinInicial));
  const [indisponivel, setIndisponivel] = useState(false);

  useImperativeHandle(ref, () => ({
    centralizar(ponto) {
      webview.current?.injectJavaScript(
        `window.ate && window.ate.colocarPin(${pontoJs(ponto)},true); true;`,
      );
    },
  }));

  function aoReceber(evento: WebViewMessageEvent) {
    const mensagem = lerMensagem(evento);
    if (mensagem?.tipo === 'erro') setIndisponivel(true);
    else if (mensagem?.tipo === 'pin') onEscolher(mensagem.ponto);
  }

  return (
    <View style={styles.area}>
      <WebView
        ref={webview}
        testID="mapa"
        style={styles.area}
        originWhitelist={['*']}
        source={{ html, baseUrl: ORIGEM_DA_PAGINA }}
        applicationNameForUserAgent="ate-app/1.0"
        onMessage={aoReceber}
        onError={() => setIndisponivel(true)}
      />
      {indisponivel ? (
        <View testID="mapa-indisponivel" style={styles.aviso}>
          <Text style={uiStyles.notice}>
            Mapa indisponível sem internet. Use &quot;Minha localização&quot; ou informe as coordenadas no formulário.
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  area: { flex: 1 },
  aviso: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing.x4 },
});
