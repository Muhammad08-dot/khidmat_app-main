import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Button } from '../Button';
import { Input } from '../Input';
import { SegmentedControl } from '../SegmentedControl';
import { GoogleButton } from '../GoogleButton';
import { StepIndicator } from '../StepIndicator';
import { Chip } from '../Chip';
import { Badge } from '../Badge';
import { Toast } from '../Toast';
import { ProviderCard } from '../ProviderCard';

describe('UI Primitives (P2-2)', () => {
  test('Button renders with label and handles press', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<Button title="Book Service" onPress={onPress} />);
    });
    const root = tree.root;
    const pressable = root.findByProps({ accessibilityRole: 'button' });
    expect(pressable).toBeTruthy();
    act(() => {
      pressable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('Input renders with label and show/hide password toggle', () => {
    const onToggle = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <Input
          label="Password"
          placeholder="Enter password"
          showPasswordToggle
          isPasswordVisible={false}
          onTogglePassword={onToggle}
        />
      );
    });
    const root = tree.root;
    const toggle = root.findByProps({ accessibilityLabel: 'Show password' });
    expect(toggle).toBeTruthy();
    act(() => {
      toggle.props.onPress();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('SegmentedControl switches between options', () => {
    const onChange = jest.fn();
    const options = [
      { value: 'customer', label: 'I need a service' },
      { value: 'provider', label: 'I offer services' },
    ];
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SegmentedControl
          options={options}
          value="customer"
          onChange={onChange}
        />
      );
    });
    const root = tree.root;
    const providerTab = root.findByProps({ testID: 'segment-provider' });
    expect(providerTab).toBeTruthy();
    act(() => {
      providerTab.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('provider');
  });

  test('GoogleButton renders official branding text and handles press', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <GoogleButton onPress={onPress} label="Continue with Google" />
      );
    });
    const root = tree.root;
    const btn = root.findByProps({ accessibilityRole: 'button' });
    expect(btn.props.accessibilityLabel).toBe('Continue with Google');
    act(() => {
      btn.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('StepIndicator renders all steps', () => {
    const steps = [{ title: 'Role' }, { title: 'Details' }, { title: 'Photo' }];
    let tree: any;
    act(() => {
      tree = renderer.create(<StepIndicator steps={steps} currentStep={1} />);
    });
    expect(tree.toJSON()).toBeTruthy();
  });

  test('Chip renders selected state and handles press', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<Chip label="Plumber" selected onPress={onPress} />);
    });
    const root = tree.root;
    const chip = root.findByProps({ accessibilityRole: 'button' });
    expect(chip.props.accessibilityState.selected).toBe(true);
    act(() => {
      chip.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('Badge and Toast render properly', () => {
    let badgeTree: any;
    let toastTree: any;
    act(() => {
      badgeTree = renderer.create(<Badge label="In Progress" variant="warning" />);
      toastTree = renderer.create(
        <Toast message="Profile updated successfully" type="success" />
      );
    });
    expect(badgeTree.toJSON()).toBeTruthy();
    expect(toastTree.toJSON()).toBeTruthy();
  });

  test('ProviderCard renders details and fires onPress', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ProviderCard
          id="p1"
          name="Ahmad Khan"
          category="Electrician"
          rating={4.9}
          totalJobs={35}
          basePrice={800}
          tier="Gold"
          onPress={onPress}
        />
      );
    });
    const root = tree.root;
    const card = root.findByProps({ accessibilityRole: 'button' });
    expect(card.props.accessibilityLabel).toContain('Ahmad Khan');
    act(() => {
      card.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
