import { render, screen } from '@testing-library/react';
import React from 'react';
import { Sender } from '../components/Sender';

describe('Sender component', () => {
  it('renders resolve form controls', () => {
    render(<Sender />);
    expect(screen.getByLabelText('ENS Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });
});

