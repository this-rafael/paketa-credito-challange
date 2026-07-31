import { Component } from '@angular/core';
import { StudioPageComponent } from './features/studio/studio.page';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StudioPageComponent],
  template: `<app-studio-page />`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class AppComponent {}
