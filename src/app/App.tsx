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
import { DataSourceListPage } from '../features/datasource/DataSourceListPage';
import { DataSourceDetailPage } from '../features/datasource/DataSourceDetailPage';
import { AppShell } from './AppShell';
import {
  getDataSourceIdFromHash,
  getProductLineFromHash,
  getRouteFromHash,
  type AppRouteKey,
  type ProductLineKey,
} from './routes';

export function App() {
  const [activeRoute, setActiveRoute] = useState<AppRouteKey>(() => getRouteFromHash(window.location.hash));
  const [productLine, setProductLine] = useState<ProductLineKey>(() => getProductLineFromHash(window.location.hash));
  const [dataSourceId, setDataSourceId] = useState<string | null>(() => getDataSourceIdFromHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setActiveRoute(getRouteFromHash(window.location.hash));
      setProductLine(getProductLineFromHash(window.location.hash));
      setDataSourceId(getDataSourceIdFromHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <AppShell activeRoute={activeRoute} productLine={productLine}>
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
      ) : activeRoute === 'datasource' ? (
        dataSourceId ? (
          <DataSourceDetailPage dataSourceId={dataSourceId} />
        ) : (
          <DataSourceListPage />
        )
      ) : (
        <ProductPage route={activeRoute} />
      )}
    </AppShell>
  );
}

