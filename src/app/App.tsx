import { ComponentGalleryPage } from '../features/component-gallery/ComponentGalleryPage';
import { AppShell } from './AppShell';

export function App() {
  return (
    <AppShell activeRoute="components">
      <ComponentGalleryPage />
    </AppShell>
  );
}
