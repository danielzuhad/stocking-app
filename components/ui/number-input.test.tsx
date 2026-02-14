import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NumberInput } from './number-input';

describe('NumberInput', () => {
  it('renders left and right attachments with formatted value', () => {
    render(
      <NumberInput
        value={1500000}
        leftAttachment="Rp"
        rightAttachment="Pcs"
      />,
    );

    expect(screen.getByText('Rp')).toBeInTheDocument();
    expect(screen.getByText('Pcs')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('1.500.000');
  });

  it('emits numeric value from user typing', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();

    render(<NumberInput value={0} onValueChange={onValueChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '125000');

    expect(onValueChange).toHaveBeenCalled();
    const latestCall = onValueChange.mock.calls.at(-1);
    expect(latestCall?.[0]).toBe(125000);
  });
});
