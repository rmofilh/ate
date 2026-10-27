import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, textStyles } from '@/constants/theme';
import type { ResultadoDaCamera } from '@/main/factories/ProviderBag';
import { ActionButton } from '@/presentation/components/ActionButton';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

interface FotoEmRevisao {
  uri: string;
  largura: number;
  altura: number;
}

/** Modal da câmera: permissão em três estados, captura e revisão (Refazer / Usar foto). */
export function CameraModal({
  visivel,
  onResultado,
}: {
  visivel: boolean;
  onResultado(resultado: ResultadoDaCamera): void;
}) {
  return (
    <Modal testID="camera-modal" visible={visivel} animationType="slide"
      onRequestClose={() => onResultado({ tipo: 'cancelado' })}>
      {visivel ? <ConteudoDaCamera onResultado={onResultado} /> : null}
    </Modal>
  );
}

function ConteudoDaCamera({ onResultado }: { onResultado(resultado: ResultadoDaCamera): void }) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [permissao, pedirPermissao, lerPermissao] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [pronta, setPronta] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [foto, setFoto] = useState<FotoEmRevisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Ao voltar das configurações do aparelho, relê a permissão.
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void lerPermissao();
    });
    return () => assinatura.remove();
  }, [lerPermissao]);

  async function capturar() {
    if (!camera.current || !pronta || capturando) return;
    setCapturando(true);
    setErro(null);
    try {
      const resultado = await camera.current.takePictureAsync({ quality: 1 });
      if (resultado) setFoto({ uri: resultado.uri, largura: resultado.width, altura: resultado.height });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível tirar a foto');
    } finally {
      setCapturando(false);
    }
  }

  function refazer() {
    setFoto(null);
    setPronta(false);
  }

  const cancelar = () => onResultado({ tipo: 'cancelado' });

  if (!permissao) {
    return (
      <SafeAreaView style={[uiStyles.screen, styles.centro]}>
        <View testID="camera-carregando" style={styles.centro}>
          <ActivityIndicator color={colors.text} accessibilityLabel="Verificando a permissão da câmera" />
          <ActionButton label="botao-cancelar-camera" title="Cancelar" appearance="secondary" onPress={cancelar} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permissao.granted) {
    return (
      <SafeAreaView style={[uiStyles.screen, styles.centro]}>
        <View testID="camera-sem-permissao" style={styles.centro}>
          <Text accessibilityRole="header" style={uiStyles.title}>Permissão da câmera</Text>
          <Text style={uiStyles.body}>
            {permissao.canAskAgain
              ? 'Para tirar a foto, o ate precisa usar a câmera. A foto fica guardada no aparelho.'
              : 'A câmera está bloqueada para o ate. Abra as configurações do aparelho, permita a câmera e volte aqui.'}
          </Text>
          {permissao.canAskAgain ? (
            <ActionButton label="botao-permitir-camera" title="Permitir câmera" icon="camera"
              appearance="primary" onPress={() => void pedirPermissao()} />
          ) : (
            <ActionButton label="botao-abrir-configuracoes" title="Abrir configurações"
              appearance="primary" onPress={() => void Linking.openSettings()} />
          )}
          <ActionButton label="botao-voltar-camera" title="Voltar" appearance="secondary"
            onPress={() =>
              onResultado(permissao.status === PermissionStatus.DENIED ? { tipo: 'negado' } : { tipo: 'cancelado' })
            } />
        </View>
      </SafeAreaView>
    );
  }

  if (foto) {
    return (
      <SafeAreaView style={styles.tela}>
        <View testID="camera-preview" style={styles.visor}>
          <Image source={{ uri: foto.uri }} style={styles.visor} contentFit="contain" accessibilityLabel="Foto tirada" />
        </View>
        <View style={styles.barra}>
          <ActionButton label="botao-refazer-foto" title="Refazer" appearance="secondary" onPress={refazer} />
          <ActionButton label="botao-usar-foto" title="Usar foto" icon="check" appearance="primary"
            onPress={() => onResultado({ tipo: 'foto', ...foto })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <CameraView ref={camera} style={styles.visor} facing="back"
        onCameraReady={() => setPronta(true)} onMountError={(evento) => setErro(evento.message)} />
      {erro ? (
        <Text testID="camera-erro" accessibilityLiveRegion="polite" style={styles.erro}>{erro}</Text>
      ) : null}
      <View style={styles.barra}>
        <ActionButton label="botao-cancelar-camera" title="Cancelar" appearance="secondary" onPress={cancelar} />
        <ActionButton label="botao-capturar" title={capturando ? 'Capturando...' : 'Tirar foto'} icon="camera"
          appearance="primary" disabled={!pronta || capturando} busy={capturando} onPress={() => void capturar()} />
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  tela: { flex: 1, backgroundColor: colors.background },
  visor: { flex: 1 },
  centro: { flexGrow: 1, justifyContent: 'center' as const, padding: spacing.x6, gap: spacing.x4 },
  barra: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.x3,
    padding: spacing.x4,
    backgroundColor: colors.surface,
  },
  erro: { ...textStyles.body, color: colors.error, backgroundColor: colors.errorSurface, padding: spacing.x3 },
}));
