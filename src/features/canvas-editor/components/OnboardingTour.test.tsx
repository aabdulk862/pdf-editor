import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { OnboardingTour } from './OnboardingTour';
import { useOnboardingStore } from '../store/onboarding-store';

// Mock getBoundingClientRect for target elements
function setupTargetElements() {
  // Create mock elements that the tour steps target
  const toolbar = document.createElement('div');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Canvas tools');
  toolbar.getBoundingClientRect = () => ({
    top: 10,
    left: 100,
    width: 400,
    height: 50,
    right: 500,
    bottom: 60,
    x: 100,
    y: 10,
    toJSON: () => ({}),
  });
  document.body.appendChild(toolbar);

  const workspace = document.createElement('div');
  workspace.setAttribute('data-testid', 'canvas-workspace');
  workspace.getBoundingClientRect = () => ({
    top: 70,
    left: 140,
    width: 600,
    height: 500,
    right: 740,
    bottom: 570,
    x: 140,
    y: 70,
    toJSON: () => ({}),
  });
  document.body.appendChild(workspace);

  const propertiesPanel = document.createElement('div');
  propertiesPanel.setAttribute('data-testid', 'properties-panel');
  propertiesPanel.getBoundingClientRect = () => ({
    top: 0,
    left: 760,
    width: 320,
    height: 600,
    right: 1080,
    bottom: 600,
    x: 760,
    y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(propertiesPanel);

  const exportButton = document.createElement('button');
  exportButton.setAttribute('aria-label', 'Export document');
  exportButton.getBoundingClientRect = () => ({
    top: 550,
    left: 20,
    width: 100,
    height: 40,
    right: 120,
    bottom: 590,
    x: 20,
    y: 550,
    toJSON: () => ({}),
  });
  document.body.appendChild(exportButton);

  const pageNavigator = document.createElement('div');
  pageNavigator.setAttribute('data-testid', 'page-navigator');
  pageNavigator.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    width: 140,
    height: 600,
    right: 140,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(pageNavigator);

  return [toolbar, workspace, propertiesPanel, exportButton, pageNavigator];
}

describe('OnboardingTour', () => {
  let mockElements: HTMLElement[] = [];

  beforeEach(() => {
    useOnboardingStore.setState({
      isOnboarded: false,
      tourActive: false,
      currentStep: 0,
      totalSteps: 5,
    });
    mockElements = setupTargetElements();
  });

  afterEach(() => {
    mockElements.forEach((el) => el.remove());
    mockElements = [];
  });

  it('does not render when tour is not active', () => {
    render(<OnboardingTour />);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });

  it('renders the tour overlay when active', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
  });

  it('displays the first step title and description', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    expect(screen.getByText('Toolbar')).toBeInTheDocument();
    expect(screen.getByText(/Use the toolbar to select drawing tools/)).toBeInTheDocument();
  });

  it('shows step indicator (Step 1 of 5)', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('advances to next step when Next button is clicked', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Next'));
    expect(useOnboardingStore.getState().currentStep).toBe(1);
  });

  it('shows "Done" button on the last step', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 4 });
    render(<OnboardingTour />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calls completeTour when Done is clicked on last step', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 4 });
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Done'));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(useOnboardingStore.getState().isOnboarded).toBe(true);
  });

  it('calls skipTour when Skip button is clicked', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    fireEvent.click(screen.getByText('Skip'));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(useOnboardingStore.getState().isOnboarded).toBe(true);
  });

  it('calls skipTour when X close button is clicked', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    fireEvent.click(screen.getByLabelText('Close tour'));
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(useOnboardingStore.getState().isOnboarded).toBe(true);
  });

  it('dismisses tour on Escape key', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useOnboardingStore.getState().tourActive).toBe(false);
  });

  it('advances step on Enter key', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useOnboardingStore.getState().currentStep).toBe(1);
  });

  it('advances step on ArrowRight key', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 1 });
    render(<OnboardingTour />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(useOnboardingStore.getState().currentStep).toBe(2);
  });

  it('completes tour on Enter key at last step', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 4 });
    render(<OnboardingTour />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(useOnboardingStore.getState().tourActive).toBe(false);
    expect(useOnboardingStore.getState().isOnboarded).toBe(true);
  });

  it('renders step dots matching total steps', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 2 });
    const { container } = render(<OnboardingTour />);
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots).toHaveLength(5);
  });

  it('has proper ARIA attributes for accessibility', () => {
    useOnboardingStore.setState({ tourActive: true, currentStep: 0 });
    render(<OnboardingTour />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Onboarding tour');
  });
});
