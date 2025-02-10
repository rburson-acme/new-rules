import { DEFAULT_THEME } from '../constants/DefaultTheme';
import { RootStore } from './RootStore';

export class ThemeStore {
  theme: typeof DEFAULT_THEME = DEFAULT_THEME;
  constructor(readonly rootStore: RootStore) {
    this.theme = this.getTheme();
  }

  private getTheme() {
    // When we start developing themes for different tenants, we will need to:
    // find the tenant,
    // then return the theme for that tenant.
    // For now, just return the default theme
    return DEFAULT_THEME;
  }
}
