export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string=} code
   */
  constructor(status, message, code) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message, code) {
  return new HttpError(400, message, code);
}

export function unauthorized(message = "Unauthorized", code) {
  return new HttpError(401, message, code);
}

