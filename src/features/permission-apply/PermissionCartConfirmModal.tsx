import { Button } from '../../components/base/Button';
import { Modal } from '../../components/feedback/Modal';
import type { PermissionCartItem } from './permissionApply';
import './permission-apply.css';

type PermissionCartConfirmModalProps = {
  open: boolean;
  item?: PermissionCartItem | null;
  cartCount: number;
  onClose: () => void;
};

export function PermissionCartConfirmModal({ open, item, cartCount, onClose }: PermissionCartConfirmModalProps) {
  const goToCart = () => {
    window.location.hash = 'my?section=cart';
  };

  return (
    <Modal open={open} title="加入申请单" onClose={onClose}>
      <div className="permission-apply-confirm">
        <div className="permission-apply-confirm__icon" aria-hidden="true">✓</div>
        <div className="permission-apply-confirm__title">已加入申请单</div>
        <div className="permission-apply-confirm__asset">{item?.name ?? '-'}</div>
        <div className="permission-apply-confirm__count">当前申请单共 <strong>{cartCount}</strong> 项资产</div>
      </div>
      <div className="permission-apply-confirm__actions">
        <Button onClick={onClose}>继续浏览</Button>
        <Button variant="primary" onClick={goToCart}>去申请单提交 →</Button>
      </div>
    </Modal>
  );
}
