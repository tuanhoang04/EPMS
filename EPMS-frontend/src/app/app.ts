import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingScreenComponent } from './shared/components/loading-screen/loading-screen.component';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingScreenComponent, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('epms-frontend');
}
