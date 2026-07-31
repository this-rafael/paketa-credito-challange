import { Component, inject, output } from '@angular/core';
import { UiButtonComponent } from '../../../../shared/ui/button/button.component';
import { UiGlassPanelComponent } from '../../../../shared/ui/glass-panel/glass-panel.component';
import { MenuStore } from '../../../../core/state/menu.store';

@Component({
  selector: 'app-studio-header',
  standalone: true,
  imports: [UiGlassPanelComponent, UiButtonComponent],
  template: `
    <ui-glass-panel class="header-wrap">
      <div class="header">
        <div class="brand">
          <h1 class="text-gradient">desafio paketa</h1>
        </div>

        <div class="actions">
          <div class="toggle" role="tablist" aria-label="Modo de visualização">
            <button
              type="button"
              [class.active]="store.viewMode() === 'tree'"
              (click)="store.setViewMode('tree')"
            >
              Árvore
            </button>
            <button
              type="button"
              [class.active]="store.viewMode() === 'map'"
              (click)="store.setViewMode('map')"
            >
              Mapa visual
            </button>
          </div>
          <ui-button variant="primary" (pressed)="createRequested.emit()">Criar item</ui-button>
        </div>
      </div>
    </ui-glass-panel>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.15rem;
      }

      .brand h1 {
        margin: 0;
        font-size: 1.55rem;
        letter-spacing: -0.02em;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.65rem;
      }

      .toggle {
        display: inline-flex;
        padding: 0.2rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: oklch(18% 0.03 275 / 0.7);
      }

      .toggle button {
        border: none;
        background: transparent;
        color: var(--muted-foreground);
        padding: 0.4rem 0.8rem;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .toggle button.active {
        background: oklch(32% 0.06 280);
        color: var(--foreground);
        box-shadow: inset 0 0 0 1px oklch(79% 0.18 155 / 0.25);
      }
    `,
  ],
})
export class StudioHeaderComponent {
  readonly store = inject(MenuStore);
  readonly createRequested = output<void>();
}
