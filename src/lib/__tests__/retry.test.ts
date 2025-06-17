import { retry } from '../retry';

describe('retry', () => {
  it('should return the result of the function if it succeeds on the first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry the function until it succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    const result = await retry(fn, 3);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw an error if the function fails on all retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, 3)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
