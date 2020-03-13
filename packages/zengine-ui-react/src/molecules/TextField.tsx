import React from 'react';
import PropTypes from 'prop-types';
import { useField } from 'formik';

import Input from '../atoms/Input';
import Label from '../atoms/Label';
import withForwardRef from '../util/withForwardRef';
import getFieldClasses from '../util/getFieldClasses';
import { isEmpty } from '../util/validation';
import ErrorMessage from '../util/ErrorMessage';

export interface TextFieldProps {
  required?: boolean
  validate?: Function
  onChange?: (event: React.ChangeEvent) => void
  onBlur?: (event: React.FocusEvent) => void
  id?: string
  name: string
  help?: string
  disabled?: boolean
  placeholder?: string
  classes?: string
  innerRef?: any
  label?: string
  labelClasses?: string
  prefix?: string
  suffix?: string
}

/**
 * The TextField molecule is a full-fledged text input Formik field with validation, help text and error messages.
 *
 * It consists of an `Input` atom, a `Label` atom and some additional markup.
 *
 * Use it to collect short textual data from users.
 */
function TextField (props: TextFieldProps): React.ReactElement {
  const validate = (value: any): any => {
    if (props.required === true && isEmpty(value)) {
      return 'Required';
    }
    if (props.validate !== undefined) {
      return props.validate(value);
    }
  };

  const [field, meta] = useField({ name: props.name, validate });

  const id = props.id ?? `text-${props.name}`;
  const helpId = !isEmpty(props.help) && !isEmpty(id) ? `${id}-help` : undefined;

  const onChangeHelper = (e: React.ChangeEvent): void => {
    // Call custom callback.
    props?.onChange?.(e);
    // Now delegate back to Formik to keep things working.
    return field.onChange(e);
  };
  const onBlurHelper = (e: React.FocusEvent): void => {
    props?.onBlur?.(e);
    return field.onBlur(e);
  };

  const input = (
    <Input
      type="text"
      id={ id }
      disabled={ props.disabled }
      required={ props.required }
      placeholder={ props.placeholder }
      classes={ getFieldClasses(meta, props.classes) }
      ref={ props.innerRef }
      describedby={ helpId }
      { ...field }
      // If we have custom onChange and onBlur callbacks we need to wrap them to keep from breaking Formik.
      onChange={ onChangeHelper }
      onBlur={ onBlurHelper }
    />
  );

  return (
    <div className="form-group">
      { !isEmpty(props.label) ? (
        <Label required={ props.required } for={ id } classes={ props.labelClasses }>{ props.label }</Label>
      ) : undefined }

      { (!isEmpty(props.prefix) || !isEmpty(props.suffix)) ? (
        <div className="input-group">
          { !isEmpty(props.prefix) ? (
            <div className="input-group-append"><span className="input-group-text">{ props.prefix }</span></div>
          ) : undefined }

          { input }

          { !isEmpty(props.prefix) ? (
            <div className="input-group-prepend"><span className="input-group-text">{ props.suffix }</span></div>
          ) : undefined }
        </div>
      ) : input }

      { !isEmpty(props.help) ? <small id={ helpId } className="form-text text-muted">{ props.help }</small> : undefined }

      <ErrorMessage meta={ meta }/>
    </div>
  );
}

TextField.propTypes = {
  /**
   * HTML element name.
   **/
  name: PropTypes.string.isRequired,
  /**
   * HTML element id.
   **/
  id: PropTypes.string,
  /**
   * Field label.
   **/
  label: PropTypes.string,
  /**
   * Marks the input as required.
   **/
  required: PropTypes.bool,
  /**
   * Marks the input as disabled.
   **/
  disabled: PropTypes.bool,
  /**
   * Marks the input as read-only.
   **/
  readonly: PropTypes.bool,
  /**
   * HTML placeholder.
   **/
  placeholder: PropTypes.string,
  /**
   * HTML classes to be added as-is to the input.
   **/
  classes: PropTypes.string,
  /**
   * HTML classes to be added as-is to the label.
   **/
  labelClasses: PropTypes.string,
  /**
   * Optional help text to display below the input.
   **/
  help: PropTypes.string,
  /**
   * Callback for when the select's value changes.
   **/
  onChange: PropTypes.func,
  /**
   * Callback for when the select loses focus.
   **/
  onBlur: PropTypes.func,
  /**
   * Custom validation callback. Only "required" is handled automatically. Should return a string.
   **/
  validate: PropTypes.func,
  /**
   * Display a prefix before the input. Useful for displaying currencies, for example.
   **/
  prefix: PropTypes.string,
  /**
   * Display a suffix after the input. Useful for displaying units, for example.
   **/
  suffix: PropTypes.string,
};

TextField.defaultProps = {
  disabled: false,
  label: '',
  placeholder: '',
  required: false,
  readonly: false,
  classes: '',
};

// Exported as a workaround due to Storybook Docs addon not processing wrapped components properly for generated Docs.
export { TextField };

export default withForwardRef(TextField);
