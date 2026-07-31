import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-glass-panel',
  standalone: true,
  template: `
    <section class="glass-panel" [class.glass-panel--strong]="strong()">
      <ng-content />
    </section>
  `,
  styles: [
    `
      .glass-panel {
        border-radius: var(--radius);
        background: var(--glass);
        border: 1px solid var(--border);
        backdrop-filter: blur(16px);
        box-shadow: var(--shadow-panel);
      }

      .glass-panel--strong {
        background: var(--glass-strong);
      }
    `,
  ],
})
export class UiGlassPanelComponent {
  readonly strong = input(false);
}
