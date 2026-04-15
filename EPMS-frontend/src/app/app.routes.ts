import { Routes } from '@angular/router';
import { Homepage } from './features/homepage/pages/homepage/homepage';
import { SubjectDetail } from './features/homepage/pages/subject-detail/subject-detail';
import { QuestionsPage } from './features/questions/pages/questions/questions';
import { TemplatesPage } from './features/templates/pages/templates/templates-page.component';
import { ExamHistoryPage } from './features/exam-history/pages/exam-history/exam-history-page.component';
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
    path: 'template',
    component: TemplatesPage
  },
  {
    path: 'history',
    component: ExamHistoryPage
  },
  {
    path: '**',
    redirectTo: ''
  }
];
