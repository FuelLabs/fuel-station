export abstract class Validator<TInput, TOutput> {
  abstract validate(input: TInput): Promise<Error | TOutput>;
  abstract getName(): string;
}
