import { Component, inject } from '@angular/core';
import { MenuStore } from '../../../../core/state/menu.store';
import { UiGlassPanelComponent } from '../../../../shared/ui/glass-panel/glass-panel.component';

@Component({
  selector: 'app-stats-strip',
  standalone: true,
  imports: [UiGlassPanelComponent],
  template: `
    <div class="stats">
      @for (stat of cards; track stat.label) {
        <ui-glass-panel>
          <div class="stat">
            <strong>{{ valueOf(stat.key) }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </ui-glass-panel>
      }
    </div>
  `,
  styles: [
    `
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .stat {
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .stat strong {
        font-size: 1.35rem;
        letter-spacing: -0.02em;
      }

      .stat span {
        color: var(--muted-foreground);
        font-size: 0.8rem;
      }

      @media (max-width: 900px) {
        .stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class StatsStripComponent {
  readonly store = inject(MenuStore);

  readonly cards = [
    { key: 'total' as const, label: 'Total de itens' },
    { key: 'roots' as const, label: 'Itens raiz' },
    { key: 'maxDepth' as const, label: 'Profundidade máx.' },
    { key: 'submenuCount' as const, label: 'Submenus' },
  ];

  valueOf(key: 'total' | 'roots' | 'maxDepth' | 'submenuCount'): number {
    return this.store.stats()[key];
  }
}
