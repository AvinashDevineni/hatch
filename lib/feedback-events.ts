import { EventEmitter } from 'events';

export interface LiveFeedbackEvent {
  startupId: string;
  deploymentUrl: string;
  timestamp: string;
  ratings: Array<{ questionId: string; question: string; value: number }>;
  comment?: string;
}

class FeedbackEventBus extends EventEmitter {}

export const feedbackEvents = new FeedbackEventBus();

export function emitLiveFeedback(event: LiveFeedbackEvent) {
  feedbackEvents.emit('feedback', event);
}
