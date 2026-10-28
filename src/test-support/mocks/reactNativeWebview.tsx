import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Dublê do react-native-webview: a WebView vira uma View que repassa as props. Os testes
 * simulam mensagens da página com fireEvent(webview, 'message', mensagemDaPagina(...)).
 */
export const webviewDeTeste = {
  injectJavaScript: jest.fn(),
  reiniciar(): void {
    webviewDeTeste.injectJavaScript.mockReset();
  },
};

/** Evento no formato do onMessage: { nativeEvent: { data } }. */
export function mensagemDaPagina(dados: unknown) {
  return { nativeEvent: { data: JSON.stringify(dados) } };
}

export const WebView = forwardRef<{ injectJavaScript: unknown }, ViewProps & Record<string, unknown>>(
  function WebView(props, ref) {
    useImperativeHandle(ref, () => ({ injectJavaScript: webviewDeTeste.injectJavaScript }));
    return <View {...props} />;
  },
);

export default WebView;
