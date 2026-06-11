import { useEffect, useState } from 'react';
import { AssetCatalogPage } from '../features/asset-catalog/AssetCatalogPage';
import { AssetSearchPage } from '../features/asset-search/AssetSearchPage';
import { ComponentGalleryPage } from '../features/component-gallery/ComponentGalleryPage';
import { ProductPage } from '../features/product-pages/ProductPage';
import { ResourceDiscoveryPage } from '../features/resource-discovery/ResourceDiscoveryPage';
import { ResourceManagementPage } from '../features/resource-management/ResourceManagementPage';
import { AppShell } from './AppShell';
import { appRoutes, type AppRouteKey } from './routes';

function getRouteFromHash(): AppRouteKey {
  const hash = window.location.hash.replace('#', '');
  const route = appRoutes.find((item) => item.key === hash);

  return route?.key ?? 'search';
}

export function App() {
  const [activeRoute, setActiveRoute] = useState<AppRouteKey>(() => getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => setActiveRoute(getRouteFromHash());

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <AppShell activeRoute={activeRoute}>
      {activeRoute === 'components' ? (
        <ComponentGalleryPage />
      ) : activeRoute === 'search' ? (
        <AssetSearchPage />
      ) : activeRoute === 'catalog' ? (
        <AssetCatalogPage />
      ) : activeRoute === 'discovery' ? (
        <ResourceDiscoveryPage />
      ) : activeRoute === 'management' ? (
        <ResourceManagementPage />
      ) : (
        <ProductPage route={activeRoute} />
      )}
    </AppShell>
  );
}
