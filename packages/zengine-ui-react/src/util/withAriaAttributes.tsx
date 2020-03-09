import React from 'react';

interface AriaProps {
  'aria-describedby'?: string
  'aria-readonly'?: boolean
  'aria-disabled'?: boolean
  'aria-required'?: boolean
}

interface NonAriaProps {
  describedby?: string
  readonly: boolean
  disabled: boolean
  required: boolean
}

/**
 * Applies ARIA attributes to a Component.
 *
 * This checks for the presence of certain HTML attributes in the props and adds the corresponding ARIA attribute
 * to the list of attributes to be rendered with the element.
 */
export default function withAriaAttributes (Component: React.FC): (props: NonAriaProps) => React.ReactElement {
  function component (props: NonAriaProps): React.ReactElement {
    const ariaProps: AriaProps = {};

    if ('describedby' in props) {
      ariaProps['aria-describedby'] = props.describedby;
    }

    if ('readonly' in props && (props.readonly || props.readonly === undefined)) {
      ariaProps['aria-readonly'] = true;
    }

    if ('disabled' in props && (props.disabled || props.disabled === undefined)) {
      ariaProps['aria-disabled'] = true;
    }

    if ('required' in props && (props.required || props.required === undefined)) {
      ariaProps['aria-required'] = true;
    }

    return <Component {...props} {...ariaProps} />;
  }

  const name = Component.displayName ?? Component.name;
  component.displayName = `withAriaAttributes(${name})`;
  return component;
};