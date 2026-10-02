/**
 * Fonte única de verdade visual do ate.
 * Telas e componentes devem consumir estes tokens.
 */
const palette = {
  white: '#FFFFFF',
  yellow: '#FFE000',
  black: '#000000',
  gold: '#765700',
  silver: '#E5E7EB',
  red: '#A52432',
} as const;

export const colors = {
  primary: palette.yellow,
  onPrimary: palette.black,
  background: palette.white,
  surface: palette.white,
  surfaceSecondary: palette.silver,
  text: palette.black,
  border: palette.black,
  focus: palette.gold,
  link: palette.gold,
  error: palette.red,
  onError: palette.white,
  // Sucesso é comunicado por check e texto, conforme a identidade.
  success: palette.black,
  selection: palette.yellow,
  onSelection: palette.black,
} as const;

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
  body: 16,
  heading: 20,
  title: 24,
  display: 32,
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
  control: 8,
  card: 12,
} as const;

export const borderWidths = {
  control: 1,
  focus: 2,
} as const;

export const layout = {
  screenPadding: spacing.x5,
  minTouchTarget: spacing.x12,
  formMaxWidth: 480,
  tabletBreakpoint: 768,
  tabBarContentHeight: 64,
} as const;
