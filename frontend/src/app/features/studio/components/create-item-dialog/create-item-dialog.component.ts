import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuStore } from '../../../../core/state/menu.store';
import { UiButtonComponent } from '../../../../shared/ui/button/button.component';
import { UiDialogComponent } from '../../../../shared/ui/dialog/dialog.component';
import { UiInputComponent } from '../../../../shared/ui/input/input.component';

@Component({
  selector: 'app-create-item-dialog',
  standalone: true,
  imports: [FormsModule, UiDialogComponent, UiInputComponent, UiButtonComponent],
  template: `
    <ui-dialog
      [open]="open()"
      title="Criar item"
      (closed)="closed.emit()"
    >
      <ui-input
        label="Nome"
        placeholder="Ex.: Televisores"
        [value]="name()"
        (valueChange)="name.set($event)"
      />

      <label class="field">
        <span>Item pai (opcional)</span>
        <select [(ngModel)]="parentId">
          <option [ngValue]="null">— Raiz —</option>
          @for (item of store.flatItems(); track item.id) {
            <option [ngValue]="item.id">
              {{ '—'.repeat(item.level) }}{{ item.level ? ' ' : '' }}{{ item.name }} ({{ item.id }})
            </option>
          }
        </select>
      </label>

      @if (store.error(); as err) {
        <p class="error">{{ err }}</p>
      }

      <div dialog-actions>
        <ui-button variant="ghost" (pressed)="closed.emit()">Cancelar</ui-button>
        <ui-button
          variant="primary"
          [disabled]="store.mutating() || !name().trim()"
          (pressed)="onSubmit()"
        >
          Criar
        </ui-button>
      </div>
    </ui-dialog>
  `,
  styles: [
    `
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .field span {
        font-size: 0.8rem;
        color: var(--muted-foreground);
        font-weight: 600;
      }

      select {
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: oklch(18% 0.03 275 / 0.8);
        padding: 0.65rem 0.8rem;
        outline: none;
      }

      select:focus {
        border-color: var(--neon-green);
        box-shadow: 0 0 0 3px var(--ring);
      }

      .error {
        margin: 0;
        color: var(--neon-red);
        font-size: 0.85rem;
      }
    `,
  ],
})
export class CreateItemDialogComponent {
  readonly store = inject(MenuStore);
  readonly open = input(false);
  readonly presetParentId = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<void>();

  readonly name = signal('');
  parentId: string | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.name.set('');
        this.parentId = this.presetParentId();
      }
    });
  }

  async onSubmit(): Promise<void> {
    const ok = await this.store.createItem(this.name(), this.parentId);
    if (ok) {
      this.created.emit();
      this.closed.emit();
    }
  }
}
