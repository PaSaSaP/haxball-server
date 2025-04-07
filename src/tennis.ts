export class Tennis {
  private enabled: boolean;
  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  isEnabled(): boolean {
    return this.enabled;
  }
}
