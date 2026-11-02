import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NeoWidgetComponent } from './shared/neo/neo-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NeoWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
