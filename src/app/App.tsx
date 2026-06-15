import { useEffect, useState } from 'react';
import { AssetCatalogPage } from '../features/asset-catalog/AssetCatalogPage';
import { AssetSearchPage } from '../features/asset-search/AssetSearchPage';
import { ApprovalIntegrationPage } from '../features/approval-integration/ApprovalIntegrationPage';
import { DetailPage } from '../features/detail/DetailPage';
import { LineagePage } from '../features/lineage/LineagePage';
import { MyPage } from '../features/my/MyPage';
import { ProductPage } from '../features/product-pages/ProductPage';
import { ResourceDiscoveryPage } from '../features/resource-discovery/ResourceDiscoveryPage';
import { ResourceManagementPage } from '../features/resource-management/ResourceManagementPage';
import { AppShell } from './AppShell';
import { appRoutes, type AppRouteKey } from './routes';

function getRouteFromHash(): AppRouteKey {
  const hash = window.location.hash.replace('#', '');
  const path = hash.split('?')[0];
  if (path === 'detail') return 'detail';
  const route = appRoutes.find((item) => item.key === path);

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
      {activeRoute === 'search' ? (
        <AssetSearchPage />
      ) : activeRoute === 'catalog' ? (
        <AssetCatalogPage />
      ) : activeRoute === 'detail' ? (
        <DetailPage />
      ) : activeRoute === 'discovery' ? (
        <ResourceDiscoveryPage />
      ) : activeRoute === 'management' ? (
        <ResourceManagementPage />
      ) : activeRoute === 'permissions' ? (
        <ApprovalIntegrationPage />
      ) : activeRoute === 'workbench' ? (
        <ProductPage route={activeRoute} />
      ) : activeRoute === 'my' ? (
        <MyPage />
      ) : activeRoute === 'lineage' ? (
        <LineagePage />
      ) : (
        <ProductPage route={activeRoute} />
      )}
    </AppShell>
  );
}
