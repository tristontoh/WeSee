/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import ChangePasswordCard from './ChangePasswordCard';
import TwoFactorAuthCard from './TwoFactorAuthCard';
import ActiveSessionsCard from './ActiveSessionsCard';

export default function SecuritySettingsTab() {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <ChangePasswordCard onResult={showToast} />
      <TwoFactorAuthCard onResult={showToast} />
      <ActiveSessionsCard onResult={showToast} />
    </div>
  );
}
