// ==========================================
// ResponseError — Custom error class untuk standarisasi error response
// Digunakan di seluruh layer (service, controller) untuk melempar error
// dengan HTTP status code yang sesuai.
// ==========================================
export class ResponseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
