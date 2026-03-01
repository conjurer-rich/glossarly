/**
 * Generic use case interface following SOLID principles.
 * All use cases must implement this contract.
 *
 * @template TRequest - The input request type
 * @template TResponse - The output response type
 */
export interface IUseCase<TRequest, TResponse> {
  /**
   * Executes the use case with the provided request.
   */
  execute(request: TRequest): Promise<TResponse>;
}
