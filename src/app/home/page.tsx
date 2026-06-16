import { Suspense } from 'react';
import HomeComponent from '@/components/home/HomeComponent';

// /home route — equivalent to Angular { path: 'home', component: HomeComponent }
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeComponent />
    </Suspense>
  );
}
