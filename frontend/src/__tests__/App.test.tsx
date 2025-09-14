import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { App } from '../App';

describe('App tabs', () => {
  it('renders Sender by default and switches tabs', () => {
    render(<App />);
    expect(screen.getByText('Sender')).toBeInTheDocument();
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText('Shielded Pool')).toBeInTheDocument();
    // Sender section visible
    expect(screen.getByText('Sender')).toBeInTheDocument();
    // Switch to Recipient
    fireEvent.click(screen.getByText('Recipient'));
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    // Switch to Pool
    fireEvent.click(screen.getByText('Shielded Pool'));
    expect(screen.getByText('Shielded Pool')).toBeInTheDocument();
  });
});

