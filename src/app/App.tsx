import { useEffect, useState } from 'react';
import { AssetCatalogPage } from '../features/asset-catalog/AssetCatalogPage';
import { AssetSearchPage } from '../features/asset-search/AssetSearchPage';
import { AIFindDataPage } from '../features/ai-find/AIFindDataPage';
import { ApprovalIntegrationPage } from '../features/approval-integration/ApprovalIntegrationPage';
import { DetailPage } from '../features/detail/DetailPage';
import { LineagePage } from '../features/lineage/LineagePage';
import { MyPage } from '../features/my/MyPage';
import { ProductPage } from '../features/product-pages/ProductPage';
import { ResourceDiscoveryPage } from '../features/resource-discovery/ResourceDiscoveryPage';
import { ResourceManagementPage } from '../features/resource-management/ResourceManagementPage';
import { DataSourceListPage } from '../features/datasource/DataSourceListPage';
import { DataSourceDetailPage } from '../features/datasource/DataSourceDetailPage';
import { DataStandardShellPage } from '../features/data-standard/DataStandardShellPage';
import { DataStandardDraftPage } from '../features/data-standard/DataStandardDraftPage';
import { AppShell } from './AppShell';
import {
  getDataSourceIdFromHash,
  getProductLineFromHash,
  getRouteFromHash,
  type AppRouteKey,
  type ProductLineKey,
} from './routes';

/**
 * 原型占位：Task 6 将替换为真实的建表向导页面。
 */
function PrototypePlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ padding: 32 }}>
      <h1>{title}（原型占位）</h1>
      <p>{note}</p>
    </div>
  );
}

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
      ) : activeRoute === 'ai-find' ? (
        <AIFindDataPage />
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
      ) : activeRoute === 'data-standard' ? (
        <DataStandardShellPage />
      ) : activeRoute === 'data-standard-draft' ? (
        <DataStandardDraftPage />
      ) : activeRoute === 'table-builder' ? (
        <PrototypePlaceholder title="建表工具" note="选库建表 + 标准推荐四步向导将在后续任务中接入" />
      ) : (
        <ProductPage route={activeRoute} />
      )}
    </AppShell>
  );
}

