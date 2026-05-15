import { render, screen } from '@testing-library/react';
import { ComponentGalleryPage } from './ComponentGalleryPage';

describe('ComponentGalleryPage', () => {
  it('renders component sections and mock resource table', () => {
    render(<ComponentGalleryPage />);

    expect(screen.getByRole('heading', { name: '前端组件库基线' })).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Tag')).toBeInTheDocument();
    expect(screen.getByText('ResourceSummary mock')).toBeInTheDocument();
    expect(screen.getByText('订单明细表')).toBeInTheDocument();
  });
});
