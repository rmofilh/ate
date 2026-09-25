import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { FakeProviders } from '../../main/factories/makeFakeProviders';
import { OfflineBanner } from '../components/OfflineBanner';

describe('shell', () => {
  it('banner aparece offline e some online', () => {
    const { rerender } = render(<OfflineBanner isOnline={false} />);

    expect(screen.getByTestId('banner-offline')).toBeTruthy();

    rerender(<OfflineBanner isOnline />);

    expect(screen.queryByTestId('banner-offline')).toBeNull();
  });

  it('FakeProviders expõe Kanban não-vazio (fixtures)', () => {
    const bag = FakeProviders.harness();

    expect(bag.pedidos.length).toBeGreaterThanOrEqual(3);
  });
});
