import React from 'react';

import { useAuth } from '../hooks/AppProviders';
import { ActionButton } from './ActionButton';

/** Botão de logout — mora no drawer, testado isoladamente. */
export function SairButton() {
  const { logout } = useAuth();
  return (
    <ActionButton label="botao-sair" title="Sair" icon="logout" onPress={() => void logout()} appearance="quiet" />
  );
}
