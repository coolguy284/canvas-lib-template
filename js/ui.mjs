import { SETTINGS_DIV } from './constants.mjs';

export function toggleSettings() {
  SETTINGS_DIV.style.display = SETTINGS_DIV.style.display == 'none' ? '' : 'none';
}
