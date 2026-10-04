/**
 * Fonte única de verdade visual do ate.
 * Telas e componentes devem consumir estes tokens.
 */
export const colors = {
  primary: '#355676',
  primaryPressed: '#28435E',
  onPrimary: '#FFFFFF',
  background: '#F7F7F2',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF1F5',
  text: '#263444',
  textSecondary: '#5B6470',
  border: '#D9DFE5',
  controlBorder: '#7B8795',
  focus: '#355676',
  link: '#355676',
  error: '#9E3546',
  errorSurface: '#FFF0F1',
  onError: '#FFFFFF',
  success: '#365E4A',
  selection: '#E6EEF7',
  onSelection: '#263444',
  accent: '#B5924D',
  // Stage colours express workflow, independently of the blue brand/actions.
  todo: '#6C5A86',
  todoSurface: '#F2EDF8',
  doing: '#995419',
  doingSurface: '#FFF0DE',
  done: '#2D6954',
  doneSurface: '#EAF4EE',
  scrim: '#111B28B8',
} as const;

export type ThemeColors = { [Key in keyof typeof colors]: string };

export const darkColors: ThemeColors = {
  primary: '#B8CDE5',
  primaryPressed: '#99B7D5',
  onPrimary: '#192432',
  background: '#192432',
  surface: '#243242',
  surfaceSecondary: '#2D4054',
  text: '#F2F3EC',
  textSecondary: '#B9C4D2',
  border: '#4F647B',
  controlBorder: '#8C9CAF',
  focus: '#B8CDE5',
  link: '#B8CDE5',
  error: '#F2ACB6',
  errorSurface: '#432A30',
  onError: '#192432',
  success: '#B5D0BD',
  selection: '#344C66',
  onSelection: '#F2F3EC',
  accent: '#D3B478',
  todo: '#D4C3E9',
  todoSurface: '#3C324C',
  doing: '#F0CF9B',
  doingSurface: '#493720',
  done: '#BCD7C5',
  doneSurface: '#30483B',
  scrim: '#080F19CC',
};

export const iconSizes = { small: 18, control: 24, feature: 32 } as const;
export const motion = { feedback: 120, transition: 180 } as const;

/** O carregamento das fontes deve usar exatamente estes nomes de registro. */
export const fontFamilies = {
  brand: 'BricolageGrotesque_700Bold',
  regular: 'AtkinsonHyperlegibleNext_400Regular',
  semibold: 'AtkinsonHyperlegibleNext_600SemiBold',
  bold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export const fontWeights = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

export const fontSizes = {
  eyebrow: 12,
  caption: 14,
  body: 16,
  cardHeading: 18,
  heading: 20,
  title: 24,
  display: 32,
  wordmark: 44,
} as const;

export const lineHeights = {
  body: 24,
} as const;

export const typography = {
  brand: {
    fontFamily: fontFamilies.brand,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
  },
  titleLarge: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
  },
  heading: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.body,
  },
} as const;

/**
 * Estilos prontos para StyleSheet.
 * Cada família registrada já contém o peso do arquivo estático. Aplicar
 * fontWeight novamente pode selecionar outra fonte no Expo Go Android.
 * Os pesos por papel permanecem documentados em typography.
 */
export const textStyles = {
  brand: {
    fontFamily: typography.brand.fontFamily,
    fontSize: typography.brand.fontSize,
  },
  titleLarge: {
    fontFamily: typography.titleLarge.fontFamily,
    fontSize: typography.titleLarge.fontSize,
  },
  title: {
    fontFamily: typography.title.fontFamily,
    fontSize: typography.title.fontSize,
  },
  heading: {
    fontFamily: typography.heading.fontFamily,
    fontSize: typography.heading.fontSize,
  },
  body: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
  },
} as const;

export const spacingBase = 4;

export const spacing = {
  none: 0,
  x1: spacingBase,
  x2: spacingBase * 2,
  x3: spacingBase * 3,
  x4: spacingBase * 4,
  x5: spacingBase * 5,
  x6: spacingBase * 6,
  x8: spacingBase * 8,
  x12: spacingBase * 12,
} as const;

export const borderRadius = {
  control: 12,
  card: 20,
  pill: 999,
} as const;

export const borderWidths = {
  control: 1,
  focus: 2,
} as const;

export const layout = {
  screenPadding: spacing.x5,
  minTouchTarget: spacing.x12,
  formMaxWidth: 480,
  listMaxWidth: 960,
  columnMinWidth: 248,
  tabletBreakpoint: 768,
  tabBarContentHeight: 64,
} as const;
