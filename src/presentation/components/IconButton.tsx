import React, { type ComponentProps } from 'react';
import { ActionButton } from './ActionButton';

export function IconButton(props: ComponentProps<typeof ActionButton> & { icon: NonNullable<ComponentProps<typeof ActionButton>['icon']> }) {
  return <ActionButton {...props} iconOnly />;
}
