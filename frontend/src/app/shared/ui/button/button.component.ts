import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      class="ui-btn"
      [class.ui-btn--primary]="variant() === 'primary'"
      [class.ui-btn--ghost]="variant() === 'ghost'"
      [class.ui-btn--danger]="variant() === 'danger'"
      [class.ui-btn--sm]="size() === 'sm'"
      [disabled]="disabled()"
      (click)="pressed.emit($event)"
    >
      <ng-content />
    </button>
  `,
  styles: [
    `
      .ui-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--accent);
        color: var(--accent-foreground);
        padding: 0.55rem 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          opacity 0.15s ease;
      }

      .ui-btn:hover:not(:disabled) {
        border-color: oklch(79% 0.18 155 / 0.45);
      }

      .ui-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ui-btn--primary {
        background: linear-gradient(135deg, oklch(72% 0.16 155), oklch(62% 0.14 180));
        color: var(--primary-foreground);
        border-color: oklch(79% 0.18 155 / 0.5);
        box-shadow: var(--shadow-glow);
      }

      .ui-btn--ghost {
        background: transparent;
      }

      .ui-btn--danger {
        background: oklch(35% 0.1 20 / 0.55);
        border-color: oklch(68% 0.21 20 / 0.45);
        color: oklch(92% 0.04 20);
      }

      .ui-btn--sm {
        padding: 0.3rem 0.6rem;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class UiButtonComponent {
  readonly variant = input<'primary' | 'ghost' | 'danger' | 'default'>('default');
  readonly size = input<'md' | 'sm'>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly pressed = output<MouseEvent>();
}
