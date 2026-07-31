import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="onBackdrop($event)">
        <div class="dialog glass-strong" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <header class="dialog__header">
            <h2>{{ title() }}</h2>
            <button type="button" class="dialog__close" (click)="closed.emit()" aria-label="Fechar">
              ×
            </button>
          </header>
          <div class="dialog__body">
            <ng-content />
          </div>
          <footer class="dialog__footer">
            <ng-content select="[dialog-actions]" />
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .dialog-backdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: oklch(10% 0.02 275 / 0.65);
        backdrop-filter: blur(4px);
      }

      .dialog {
        width: min(440px, 100%);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        background: var(--glass-strong);
        box-shadow: var(--shadow-panel), var(--shadow-glow);
        padding: 1rem 1.1rem 1.1rem;
      }

      .dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.85rem;
      }

      .dialog__header h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .dialog__close {
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
      }

      .dialog__body {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .dialog__footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
      }
    `,
  ],
})
export class UiDialogComponent {
  readonly open = input(false);
  readonly title = input('Dialog');
  readonly closed = output<void>();

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
