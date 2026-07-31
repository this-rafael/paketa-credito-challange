import { Component, inject, output } from '@angular/core';
import { MenuStore } from '../../../../core/state/menu.store';
import { UiBadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { UiButtonComponent } from '../../../../shared/ui/button/button.component';
import { UiGlassPanelComponent } from '../../../../shared/ui/glass-panel/glass-panel.component';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [UiGlassPanelComponent, UiBadgeComponent, UiButtonComponent],
  template: `
    <ui-glass-panel class="detail">
      <div class="detail__inner">
        <header>
          <h2>Detalhes</h2>
          @if (store.selectedFlat(); as item) {
            <ui-badge tone="blue">nível {{ item.level }}</ui-badge>
          }
        </header>

        @if (store.selectedFlat(); as item) {
          <div class="fields">
            <div>
              <span>Nome</span>
              <strong>{{ item.name }}</strong>
            </div>
            <div>
              <span>ID</span>
              <strong>{{ item.id }}</strong>
            </div>
            <div>
              <span>Pai</span>
              <strong>{{ item.parentId ?? '— (raiz)' }}</strong>
            </div>
            <div>
              <span>Filhos</span>
              <strong>{{ item.childCount }}</strong>
            </div>
            <div class="path">
              <span>Caminho</span>
              <strong>{{ item.path.join(' / ') }}</strong>
            </div>
          </div>

          <div class="actions">
            <ui-button variant="ghost" (pressed)="addChildRequested.emit(item.id)">
              Adicionar filho
            </ui-button>
            <ui-button variant="danger" [disabled]="store.mutating()" (pressed)="onDelete()">
              Excluir
            </ui-button>
          </div>
        } @else {
          <p class="empty">
            Selecione um item na árvore ou no mapa para ver os detalhes.
          </p>
        }
      </div>
    </ui-glass-panel>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .detail__inner {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 280px;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      header h2 {
        margin: 0;
        font-size: 1rem;
      }

      .fields {
        display: grid;
        gap: 0.75rem;
      }

      .fields > div {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .fields span {
        font-size: 0.75rem;
        color: var(--muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .fields strong {
        font-size: 0.95rem;
        font-weight: 600;
        word-break: break-word;
      }

      .empty {
        color: var(--muted-foreground);
        margin: 0;
        font-size: 0.9rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: auto;
      }
    `,
  ],
})
export class ItemDetailComponent {
  readonly store = inject(MenuStore);
  readonly addChildRequested = output<string>();

  async onDelete(): Promise<void> {
    const item = this.store.selectedFlat();
    if (!item) return;
    if (!confirm(`Excluir "${item.name}"?`)) return;
    await this.store.deleteSelected();
  }
}
