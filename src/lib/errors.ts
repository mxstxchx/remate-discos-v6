export class CartOperationError extends Error {
  constructor(
    message: string,
    public code: 'VALIDATION' | 'RESERVATION' | 'QUEUE' | 'NETWORK',
    public context?: any
  ) {
    super(message);
    this.name = 'CartOperationError';
  }
}

export class ReservationError extends Error {
  constructor(
    message: string,
    public code: 'ALREADY_RESERVED' | 'QUEUE_FULL' | 'EXPIRED',
    public context?: any
  ) {
    super(message);
    this.name = 'ReservationError';
  }
}

export interface CheckoutConflict {
  release_id: number;
  title: string;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public conflicts: CheckoutConflict[]
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

// Helper function to handle cart errors
export const handleCartError = (error: unknown): string => {
  if (error instanceof CartOperationError) {
    switch (error.code) {
      case 'VALIDATION':
        return 'Item status has changed. Please try again.';
      case 'RESERVATION':
        return 'This item is no longer available.';
      case 'QUEUE':
        return 'Unable to join queue. Please try again.';
      case 'NETWORK':
        return 'Network error. Please check your connection.';
    }
  }
  return 'An unexpected error occurred.';
};

// Helper function to handle reservation errors
export const handleReservationError = (error: unknown): string => {
  if (error instanceof ReservationError) {
    switch (error.code) {
      case 'ALREADY_RESERVED':
        return 'This item is already reserved.';
      case 'QUEUE_FULL':
        return 'The queue is currently full.';
      case 'EXPIRED':
        return 'The reservation has expired.';
    }
  }
  return 'Unable to process reservation.';
};