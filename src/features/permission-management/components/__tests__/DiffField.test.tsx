import { render, screen } from '@testing-library/react';
import { DiffField } from '../DiffField';

describe('DiffField', () => {
  it('renders before and after with a label', () => {
    render(<DiffField label="目录" before="A/B" after="A/C" />);
    expect(screen.getByText('目录')).toBeInTheDocument();
    expect(screen.getByText('A/B')).toBeInTheDocument();
    expect(screen.getByText('A/C')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('renders nothing when before is empty', () => {
    const { container } = render(<DiffField label="目录" before="" after="A/C" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when after is empty', () => {
    const { container } = render(<DiffField label="目录" before="A/B" after="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when both are empty', () => {
    const { container } = render(<DiffField label="目录" before="" after="" />);
    expect(container.firstChild).toBeNull();
  });
});
