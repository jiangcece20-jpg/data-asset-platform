import { useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tabs } from '../../components/base/Tabs';
import { Tag } from '../../components/base/Tag';
import { DataTable } from '../../components/data-display/DataTable';
import { Drawer } from '../../components/feedback/Drawer';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Modal } from '../../components/feedback/Modal';
import { FormControl } from '../../components/forms/FormControl';
import { galleryResources, resourceColumns } from './galleryData';
import './component-gallery.css';

export function ComponentGalleryPage() {
  const [activeTab, setActiveTab] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="component-gallery">
      <header className="component-gallery__header">
        <h1 className="component-gallery__title">前端组件库基线</h1>
        <div className="component-gallery__subtitle">对齐现有 HTML 原型的基础控件、数据展示和反馈组件。</div>
      </header>

      <div className="component-gallery__grid">
        <section className="component-gallery__section">
          <h2>Button</h2>
          <div className="component-gallery__row">
            <Button variant="primary">主按钮</Button>
            <Button>次按钮</Button>
            <Button variant="text">文本按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button loading>加载中</Button>
          </div>
        </section>

        <section className="component-gallery__section">
          <h2>Tag</h2>
          <div className="component-gallery__row">
            <Tag tone="blue">表</Tag>
            <Tag tone="success">已有权限</Tag>
            <Tag tone="warning">申请权限</Tag>
            <Tag tone="danger">已拒绝</Tag>
            <Tag tone="purple">指标</Tag>
            <Tag tone="cyan">API</Tag>
          </div>
        </section>

        <section className="component-gallery__section">
          <h2>Tabs</h2>
          <Tabs
            activeKey={activeTab}
            items={[
              { key: 'table', label: '表格' },
              { key: 'chart', label: '图表' },
              { key: 'source', label: '来源' },
            ]}
            onChange={setActiveTab}
          />
        </section>

        <section className="component-gallery__section">
          <h2>FormControl</h2>
          <div className="component-gallery__form">
            <FormControl label="资源名称" placeholder="请输入资源名称" />
          </div>
        </section>

        <section className="component-gallery__section">
          <h2>Modal / Drawer</h2>
          <div className="component-gallery__row">
            <Button onClick={() => setModalOpen(true)}>打开弹窗</Button>
            <Button onClick={() => setDrawerOpen(true)}>打开抽屉</Button>
          </div>
          <Modal open={modalOpen} title="确认操作" onClose={() => setModalOpen(false)}>
            这是一个用于审批、确认或补充说明的弹窗。
          </Modal>
          <Drawer open={drawerOpen} title="历史记录" onClose={() => setDrawerOpen(false)}>
            抽屉适合承载查询历史、详情补充和侧边操作。
          </Drawer>
        </section>

        <section className="component-gallery__section">
          <h2>EmptyState</h2>
          <EmptyState title="暂无数据" description="调整筛选条件后重试" />
        </section>

        <section className="component-gallery__section component-gallery__section--wide">
          <h2>ResourceSummary mock</h2>
          <DataTable columns={resourceColumns} rows={galleryResources} />
        </section>
      </div>
    </section>
  );
}
