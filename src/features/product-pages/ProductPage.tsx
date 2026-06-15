import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import './product-page.css';

type ProductPageConfig = {
  title: string;
  subtitle: string;
  eyebrow: string;
  primaryAction: string;
  secondaryAction: string;
  sections: { title: string; description: string; tone: 'blue' | 'success' | 'warning' | 'purple' | 'cyan' }[];
};

const pageConfigs = {
  search: {
    title: '资产检索',
    subtitle: '面向用户的统一资产搜索入口，承接表、指标、报表、API 等资源检索。',
    eyebrow: 'Search workspace',
    primaryAction: '搜索资产',
    secondaryAction: '高级筛选',
    sections: [
      { title: '关键词检索', description: '支持中文名、英文名、负责人、标签等组合查询。', tone: 'blue' },
      { title: '建议下拉', description: '后续接入 ResourceSearchBox，复用主平台搜索建议。', tone: 'cyan' },
      { title: '详情跳转', description: '检索结果统一进入 ResourceDetailHeader 和详情模块。', tone: 'success' },
    ],
  },
  catalog: {
    title: '资产目录',
    subtitle: '按照业务域、主题域和目录层级组织数据资产。',
    eyebrow: 'Catalog workspace',
    primaryAction: '新增目录',
    secondaryAction: '目录治理',
    sections: [
      { title: '目录树', description: '承接现有资产目录树和目录详情布局。', tone: 'blue' },
      { title: '资源归类', description: '支持未归类资源、批量移动和目录审批入口。', tone: 'warning' },
      { title: '目录统计', description: '展示资源数量、层级深度和负责人信息。', tone: 'purple' },
    ],
  },
  discovery: {
    title: '资源发现',
    subtitle: '以推荐、热门、最近更新等方式帮助用户发现可用资产。',
    eyebrow: 'Discovery workspace',
    primaryAction: '查看推荐',
    secondaryAction: '筛选资源',
    sections: [
      { title: '推荐卡片', description: '沉淀 ResourceCard 的标准样式和操作区。', tone: 'success' },
      { title: '热门资源', description: '保留浏览量、使用热度、收藏等信号展示。', tone: 'warning' },
      { title: '来源标签', description: '统一表、指标、报表、API 的 Tag 显示规范。', tone: 'cyan' },
    ],
  },
  management: {
    title: '资源管理',
    subtitle: '面向资产负责人维护资源元数据、上下架、标签和负责人信息。',
    eyebrow: 'Management workspace',
    primaryAction: '新增资源',
    secondaryAction: '批量维护',
    sections: [
      { title: '资源列表', description: '复用 DataTable、Tag 和批量操作条。', tone: 'blue' },
      { title: '维护表单', description: '复用 FormControl、Modal、Drawer 承载编辑流程。', tone: 'purple' },
      { title: '治理审批', description: '与权限管理中的流程状态组件保持一致。', tone: 'warning' },
    ],
  },
  workbench: {
    title: '即席查询',
    subtitle: '轻量 SQL 工作台，后续迁移表字段面板、多页签、查询结果和历史抽屉。',
    eyebrow: 'SQL workspace',
    primaryAction: '新建查询',
    secondaryAction: '打开历史',
    sections: [
      { title: 'SQL 工作台骨架', description: '预留 SqlWorkbenchShell 的三栏和上下分割布局。', tone: 'blue' },
      { title: '表字段面板', description: '仅展示已授权表，后续接入权限服务。', tone: 'success' },
      { title: '结果展示', description: '复用 QueryResultView 统一表格和图表输出。', tone: 'cyan' },
    ],
  },
  permissions: {
    title: '权限管理',
    subtitle: '统一承接权限状态、申请工单、审批流程和重新申请能力。',
    eyebrow: 'Permission workspace',
    primaryAction: '发起申请',
    secondaryAction: '查看工单',
    sections: [
      { title: '权限状态与申请流程骨架', description: '沉淀 PermissionBadge、PermissionActionBar 和审批时间线。', tone: 'warning' },
      { title: '我的申请', description: '按状态查看待审、已通过、已拒绝和已撤回工单。', tone: 'blue' },
      { title: '我有权限的', description: '与资产检索和 SQL 工作台共享权限状态枚举。', tone: 'success' },
    ],
  },
} as const;

type PageKey = keyof typeof pageConfigs;

interface ProductPageProps {
  route: PageKey;
}

export function ProductPage({ route }: ProductPageProps) {
  const page = pageConfigs[route];

  return (
    <section className="product-page">
      <header className="product-page__hero">
        <div>
          <div className="product-page__eyebrow">{page.eyebrow}</div>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
        </div>
        <div className="product-page__actions">
          <Button variant="primary">{page.primaryAction}</Button>
          <Button>{page.secondaryAction}</Button>
        </div>
      </header>

      <div className="product-page__grid">
        {page.sections.map((section) => (
          <article className="product-page__card" key={section.title}>
            <div className="product-page__card-head">
              <h2>{section.title}</h2>
              <Tag tone={section.tone}>{section.title.slice(0, 4)}</Tag>
            </div>
            <p>{section.description}</p>
          </article>
        ))}
      </div>

      <section className="product-page__panel">
        <EmptyState title="页面骨架已就位" description="下一步迁移对应 HTML 原型的真实业务交互。" />
      </section>
    </section>
  );
}
