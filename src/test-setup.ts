// Polyfill ElementInternals for happy-dom which doesn't support it
if (typeof HTMLElement.prototype.attachInternals !== 'function') {
  HTMLElement.prototype.attachInternals = function () {
    const internals = {
      form: this.closest?.('form') ?? null,
      setFormValue: () => {},
      setValidity: () => {},
      reportValidity: () => true,
      checkValidity: () => true,
      validationMessage: '',
      validity: {
        valid: true,
        badInput: false,
        customError: false,
        patternMismatch: false,
        rangeOverflow: false,
        rangeUnderflow: false,
        stepMismatch: false,
        tooLong: false,
        tooShort: false,
        typeMismatch: false,
        valueMissing: false,
      },
      willValidate: true,
      labels: [],
      shadowRoot: this.shadowRoot,
      states: new Set(),
    };

    return internals as unknown as ElementInternals;
  };
}
