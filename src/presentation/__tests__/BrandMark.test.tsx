import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'expo-image';

import { colors, darkColors } from '../../constants/theme';
import { BrandMark } from '../components/BrandMark';
import { useDesignTheme } from '../hooks/useDesignTheme';

jest.mock('../hooks/useDesignTheme', () => ({ useDesignTheme: jest.fn() }));
jest.mock('expo-image', () => ({ Image: jest.fn(() => null) }));

describe('origem da flor-de-lis', () => {
  it.each(['light', 'dark'] as const)('usa SVG empacotado no tema %s, evitando a URI UTF-8 incompatível no Android', async (scheme) => {
    jest.mocked(useDesignTheme).mockReturnValue({ scheme, colors: scheme === 'dark' ? darkColors : colors });
    await render(<BrandMark />);

    // The preset exposes bundled assets as testUri metadata. Check both the local
    // source format and the theme variant; pixel rendering is verified separately.
    expect(jest.mocked(Image).mock.lastCall?.[0].source).toEqual(expect.objectContaining({
      testUri: expect.stringMatching(new RegExp(`/fleur-de-lis-${scheme}\\.svg$`)),
    }));
  });
});
