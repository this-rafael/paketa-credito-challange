import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  template: `
    <span
      class="ui-badge"
      [class.ui-badge--green]="tone() === 'green'"
      [class.ui-badge--red]="tone() === 'red'"
      [class.ui-badge--blue]="tone() === 'blue'"
      [class.ui-badge--muted]="tone() === 'muted'"
    >
      <ng-content />
    </span>
  `,
  styles: [
    `
      .ui-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border-radius: 999px;
        padding: 0.15rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid var(--border);
        background: var(--muted);
        color: var(--muted-foreground);
        white-space: nowrap;
      }

      .ui-badge--green {
        color: var(--neon-green);
        border-color: oklch(79% 0.18 155 / 0.35);
        background: oklch(30% 0.08 155 / 0.25);
      }

      .ui-badge--red {
        color: var(--neon-red);
        border-color: oklch(68% 0.21 20 / 0.4);
        background: oklch(30% 0.08 20 / 0.25);
      }

      .ui-badge--blue {
        color: var(--neon-blue);
        border-color: oklch(72% 0.14 250 / 0.4);
        background: oklch(30% 0.08 250 / 0.25);
      }

      .ui-badge--muted {
        color: var(--muted-foreground);
      }
    `,
  ],
})
export class UiBadgeComponent {
  readonly tone = input<'green' | 'red' | 'blue' | 'muted'>('muted');
}
