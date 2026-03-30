import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-homepage',
  imports: [
    CommonModule,
    HeaderComponent,
    ButtonModule],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})
export class Homepage {
  subjects = Array.from({ length: 12 }).map((_, i) => ({
    title: `Subject ${i + 1}`,
    questions: 100,
    topics: 5,
    description: 'Description 2',
    image: 'https://picsum.photos/400/200'
  }));
}
