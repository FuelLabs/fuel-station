abstract class Validator {
  abstract validate(): Promise<Error | null>;
  abstract getName(): string;
}

export class ValidationManager {
  private validators: Validator[];

  constructor(validators: Validator[]) {
    this.validators = validators;
  }

  addValidator(validator: Validator) {
    this.validators.push(validator);
  }

  async validate(): Promise<{ name: string; error: Error } | null> {
    for (const validator of this.validators) {
      const result = await validator.validate();

      if (result) {
        return { name: validator.getName(), error: result };
      }
    }

    return null;
  }
}
