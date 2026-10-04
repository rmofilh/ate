import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { borderRadius, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { normalizeSelectionSearch } from '@/presentation/utils/selection';
import { ActionButton } from './ActionButton';
import { AppIcon, type IconName } from './AppIcon';
import { IconButton } from './IconButton';
import { StyledTextInput } from './StyledTextInput';

export interface SelectionOption {
  id: string;
  title: string;
  detail: string;
  keywords?: string;
  icon: IconName;
  badge?: string;
}

const noPinnedOptions: readonly SelectionOption[] = [];

const SelectionRow = React.memo(function SelectionRow({ item, selected, testID, selectedPrefix, onSelect }: {
  item: SelectionOption;
  selected: boolean;
  testID: string;
  selectedPrefix: string;
  onSelect(id: string): void;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable testID={testID} accessibilityRole="button"
    accessibilityLabel={selected ? `${selectedPrefix}: ${item.title}` : item.title}
    accessibilityHint={item.detail} accessibilityState={{ selected }}
    {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={() => onSelect(item.id)}
    style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed, focused && styles.focused]}>
    <View style={styles.icon}><AppIcon name={item.icon} color={colors.primary} /></View>
    <View style={styles.copy}>
      <Text style={styles.optionTitle}>{item.title}</Text>
      <Text style={styles.detail}>{item.detail}</Text>
      {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
    </View>
    {selected ? <AppIcon name="check" color={colors.primary} /> : null}
  </Pressable>;
});

/** A bounded modal list, outside the form's ScrollView, with UI-only filtering. */
export function SelectionSheet({ title, searchLabel, emptyMessage, options, selectedId, testIDPrefix,
  selectedPrefix = 'Selecionado', pinnedOptions = noPinnedOptions, createTestID = 'cadastrar-cliente-no-seletor',
  onSelect, onDismiss, onCreate }: {
  title: string;
  searchLabel: string;
  emptyMessage: string;
  options: readonly SelectionOption[];
  selectedId: string | null;
  testIDPrefix: string;
  selectedPrefix?: string;
  pinnedOptions?: readonly SelectionOption[];
  createTestID?: string;
  onSelect(id: string): void;
  onDismiss(): void;
  onCreate?(): void;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const { fontScale } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const term = normalizeSelectionSearch(query);
    const pinnedIds = new Set(pinnedOptions.map((item) => item.id));
    const choices = options.filter((item) => !pinnedIds.has(item.id));
    return term ? choices.filter((item) => normalizeSelectionSearch(`${item.title} ${item.detail} ${item.keywords ?? ''}`).includes(term)) : choices;
  }, [options, pinnedOptions, query]);
  const select = useCallback((id: string) => { Keyboard.dismiss(); onSelect(id); }, [onSelect]);
  const renderItem = useCallback<ListRenderItem<SelectionOption>>(({ item }) =>
    <SelectionRow item={item} selected={selectedId === item.id} testID={`${testIDPrefix}-${item.id}`}
      selectedPrefix={selectedPrefix} onSelect={select} />,
  [selectedId, testIDPrefix, selectedPrefix, select]);

  return <Modal testID={`${testIDPrefix}-modal`} transparent visible animationType="none"
    supportedOrientations={['portrait', 'landscape']} onRequestClose={onDismiss}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.scrim} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View accessibilityViewIsModal aria-modal style={styles.panel}>
          <FlatList testID={`${testIDPrefix}-lista`} data={filtered} renderItem={renderItem} keyExtractor={(item) => item.id}
            style={styles.list} contentContainerStyle={styles.items} keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            // Large text can scroll the entire header instead of squeezing the results to zero height.
            stickyHeaderIndices={fontScale <= 1.6 ? [0] : undefined}
            ListHeaderComponent={<View style={styles.listHeader}>
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                <IconButton label={`${testIDPrefix}-fechar`} title={`Fechar ${title.toLowerCase()}`} icon="close"
                  appearance="quiet" onPress={onDismiss} />
              </View>
              {pinnedOptions.length > 0 ? <View testID={`${testIDPrefix}-fixados`} style={styles.pinned}>
                {pinnedOptions.map((item) => <SelectionRow key={item.id} item={item} selected={selectedId === item.id}
                  testID={`${testIDPrefix}-${item.id}`} selectedPrefix={selectedPrefix} onSelect={select} />)}
              </View> : null}
              <View style={styles.search}>
                <AppIcon name="search" color={colors.textSecondary} />
                <StyledTextInput testID={`${testIDPrefix}-busca`} accessibilityLabel={searchLabel}
                  placeholder={searchLabel} value={query} onChangeText={setQuery} autoCorrect={false}
                  autoCapitalize="none" returnKeyType="search" style={styles.searchInput} />
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.detail}>
                {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
              </Text>
            </View>}
            ListEmptyComponent={<Text style={styles.empty}>{query ? 'Nenhum resultado para esta busca.' : emptyMessage}</Text>}
            ListFooterComponent={onCreate ? <ActionButton label={createTestID} title="Cadastrar novo cliente" icon="plus"
              onPress={onCreate} appearance="secondary" /> : null} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const useStyles = createThemedStyles((colors) => ({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.x3 },
  panel: { flex: 1, minHeight: 0, width: '100%', maxWidth: layout.formMaxWidth, maxHeight: '92%',
    backgroundColor: colors.surface, borderRadius: borderRadius.card, padding: spacing.x4, gap: spacing.x3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2, flexShrink: 0 },
  listHeader: { gap: spacing.x3, paddingBottom: spacing.x3, backgroundColor: colors.surface },
  pinned: { gap: spacing.x2 },
  title: { ...textStyles.heading, color: colors.text, flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2, flexShrink: 0 },
  searchInput: { flex: 1, minWidth: 0 },
  list: { flex: 1, minHeight: 0 },
  items: { gap: spacing.x2, paddingBottom: spacing.x2 },
  option: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x3,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.control, padding: spacing.x3 },
  selected: { backgroundColor: colors.selection, borderColor: colors.focus },
  pressed: { backgroundColor: colors.surfaceSecondary },
  focused: { outlineColor: colors.focus, outlineWidth: 2, outlineOffset: 2, borderColor: colors.focus },
  icon: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.control, padding: spacing.x2 },
  copy: { flex: 1, gap: spacing.x1 },
  optionTitle: { ...textStyles.label, color: colors.text },
  detail: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  badge: { ...textStyles.label, fontSize: fontSizes.eyebrow, color: colors.primary },
  empty: { ...textStyles.body, color: colors.textSecondary, paddingVertical: spacing.x4 },
}));
