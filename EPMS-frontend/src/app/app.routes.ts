import { Routes } from '@angular/router';
import { Homepage } from './features/homepage/pages/homepage/homepage';
import { SubjectDetail } from './features/homepage/pages/subject-detail/subject-detail';
import { QuestionsPage } from './features/questions/pages/questions/questions';

export const routes: Routes = [
  {
    path: '',
    component: Homepage
  },
  {
    path: 'subjects/:id',
    component: SubjectDetail
  },
  {
    path: 'questions',
    component: QuestionsPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
