import { render, screen } from '@testing-library/react';

describe('smoke', () => {
  it('renders basic content', () => {
    render(<div>Hello</div>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
