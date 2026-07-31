import { Component, inject, output } from '@angular/core';
import { MenuStore } from '../../../../core/state/menu.store';
import { UiButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-menu-tree',
  standalone: true,
  imports: [UiButtonComponent],
  template: `
    <div class="tree">
      @if (store.loading()) {
        <p class="empty">Carregando menu…</p>
      } @else if (store.flatItems().length === 0) {
        <p class="empty">Nenhum item cadastrado. Crie o primeiro item raiz.</p>
      } @else {
        @for (item of store.flatItems(); track item.id) {
          <div class="node" [style.paddingLeft.rem]="item.level * 1.1">
            <button
              type="button"
              class="node__main"
              [class.selected]="store.selectedId() === item.id"
              (click)="store.select(item.id)"
            >
              <div class="node__text">
                <strong>{{ item.name }}</strong>
                <span>
                  id {{ item.id }} · nível {{ item.level }} · {{ item.childCount }} filho(s)
                </span>
              </div>
            </button>
            <div class="node__actions">
              <ui-button
                size="sm"
                variant="ghost"
                (pressed)="onAddChild(item.id, $event)"
              >
                +
              </ui-button>
              <ui-button
                size="sm"
                variant="danger"
                (pressed)="onDelete(item.id, $event)"
              >
                Excluir
              </ui-button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .tree {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-height: 220px;
      }

      .empty {
        color: var(--muted-foreground);
        margin: 1rem 0;
        font-size: 0.9rem;
      }

      .node {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.35rem;
        align-items: center;
      }

      .node__main {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        text-align: left;
        border: 1px solid transparent;
        background: transparent;
        border-radius: var(--radius-sm);
        padding: 0.45rem 0.55rem;
        cursor: pointer;
        color: inherit;
        min-width: 0;
      }

      .node__main:hover {
        background: oklch(30% 0.04 275 / 0.35);
      }

      .node__main.selected {
        border-color: oklch(79% 0.18 155 / 0.4);
        background: oklch(30% 0.06 155 / 0.18);
        box-shadow: var(--shadow-glow);
      }

      .node__text {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
      }

      .node__text strong {
        font-size: 0.92rem;
      }

      .node__text span {
        font-size: 0.72rem;
        color: var(--muted-foreground);
      }

      .node__actions {
        display: flex;
        gap: 0.25rem;
      }
    `,
  ],
})
export class MenuTreeComponent {
  readonly store = inject(MenuStore);
  readonly addChildRequested = output<string>();

  onAddChild(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.store.select(id);
    this.addChildRequested.emit(id);
  }

  async onDelete(id: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!confirm(`Excluir o item "${id}"?`)) return;
    await this.store.deleteItem(id);
  }
}
