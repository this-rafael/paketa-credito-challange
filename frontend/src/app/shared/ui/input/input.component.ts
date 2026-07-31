import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-input',
  standalone: true,
  template: `
    <label class="ui-field">
      @if (label()) {
        <span class="ui-field__label">{{ label() }}</span>
      }
      <input
        class="ui-field__control"
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled()"
        (input)="onInput($event)"
      />
    </label>
  `,
  styles: [
    `
      .ui-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        width: 100%;
      }

      .ui-field__label {
        font-size: 0.8rem;
        color: var(--muted-foreground);
        font-weight: 600;
      }

      .ui-field__control {
        width: 100%;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: oklch(18% 0.03 275 / 0.8);
        padding: 0.65rem 0.8rem;
        outline: none;
      }

      .ui-field__control:focus {
        border-color: var(--neon-green);
        box-shadow: 0 0 0 3px var(--ring);
      }
    `,
  ],
})
export class UiInputComponent {
  readonly label = input('');
  readonly type = input('text');
  readonly placeholder = input('');
  readonly value = input('');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
