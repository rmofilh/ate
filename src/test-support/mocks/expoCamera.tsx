import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';

/** Dublê do expo-camera (SDK 57) controlado pelos testes por `cameraDeTeste`. */
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
} as const;

interface Permissao {
  granted: boolean;
  canAskAgain: boolean;
  status: (typeof PermissionStatus)[keyof typeof PermissionStatus];
  expires: 'never';
}

export const permissoes: Record<string, Permissao> = {
  concedida: { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
  indeterminada: { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' },
  negada: { granted: false, canAskAgain: true, status: 'denied', expires: 'never' },
  negadaParaSempre: { granted: false, canAskAgain: false, status: 'denied', expires: 'never' },
};

interface PropsDaCamera {
  onCameraReady?(): void;
  onMountError?(evento: { message: string }): void;
}

interface FotoDaCamera {
  uri: string;
  width: number;
  height: number;
  format: string;
}

const FOTO_PADRAO: FotoDaCamera = {
  uri: 'file:///cache/Camera/foto.jpg',
  width: 4000,
  height: 3000,
  format: 'jpg',
};
let ultimasProps: PropsDaCamera | null = null;

export const cameraDeTeste = {
  permissao: permissoes.concedida as Permissao | null,
  respostaAoPedir: permissoes.concedida,
  prontaAoMontar: true,
  erroAoMontar: null as string | null,
  proximaFoto: FOTO_PADRAO,
  // Tipo de retorno explícito: evita a autorreferência no inicializador (TS7022).
  takePictureAsync: jest.fn(async (_opcoes?: unknown): Promise<FotoDaCamera> => cameraDeTeste.proximaFoto),
  pedirPermissao: jest.fn(),
  lerPermissao: jest.fn(),
  /** Simula o onCameraReady quando prontaAoMontar = false (envolver em act). */
  ficarPronta(): void {
    ultimasProps?.onCameraReady?.();
  },
  reiniciar(): void {
    cameraDeTeste.permissao = permissoes.concedida;
    cameraDeTeste.respostaAoPedir = permissoes.concedida;
    cameraDeTeste.prontaAoMontar = true;
    cameraDeTeste.erroAoMontar = null;
    cameraDeTeste.proximaFoto = FOTO_PADRAO;
    cameraDeTeste.takePictureAsync.mockReset();
    cameraDeTeste.takePictureAsync.mockImplementation(async (): Promise<FotoDaCamera> => cameraDeTeste.proximaFoto);
    cameraDeTeste.pedirPermissao.mockReset();
    cameraDeTeste.lerPermissao.mockReset();
    ultimasProps = null;
  },
};

export function useCameraPermissions() {
  const [permissao, setPermissao] = useState(cameraDeTeste.permissao);
  const pedir = useCallback(async () => {
    cameraDeTeste.pedirPermissao();
    cameraDeTeste.permissao = cameraDeTeste.respostaAoPedir;
    setPermissao(cameraDeTeste.permissao);
    return cameraDeTeste.permissao;
  }, []);
  const ler = useCallback(async () => {
    cameraDeTeste.lerPermissao();
    setPermissao(cameraDeTeste.permissao);
    return cameraDeTeste.permissao;
  }, []);
  return [permissao, pedir, ler] as const;
}

export const CameraView = forwardRef<{ takePictureAsync: unknown }, PropsDaCamera>(
  function CameraView(props, ref) {
    useImperativeHandle(ref, () => ({ takePictureAsync: cameraDeTeste.takePictureAsync }));
    useEffect(() => {
      ultimasProps = props;
    });
    useEffect(() => {
      if (cameraDeTeste.erroAoMontar) props.onMountError?.({ message: cameraDeTeste.erroAoMontar });
      else if (cameraDeTeste.prontaAoMontar) props.onCameraReady?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem, como a câmera real
    }, []);
    return <View testID="camera-view" />;
  },
);
