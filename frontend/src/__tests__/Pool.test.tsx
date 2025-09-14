import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Pool } from '../components/Pool';

describe('Pool component', () => {
  it('renders deposit and sweep forms', async () => {
    render(<Pool />);
    await waitFor(() => expect(screen.getByText('Deposit (Sender)')).toBeInTheDocument());
    expect(screen.getByText('Sweep (Recipient)')).toBeInTheDocument();
  });
});
