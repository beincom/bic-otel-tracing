export const TRACER = 'tracer';

export const SPANS = {
  CONSUME: 'consume-message',
  PARSE_REQUEST_COMMAND: 'parsed-request-command',
  CREATE_ACTIVITY_COMMAND: 'create-activity-command',
  CREATE_NOTIFICATION_JOBS_COMMAND: 'create-notification-jobs-command',
  ADD_WORKFLOW_JOB_TO_QUEUE: 'add-workflow-job-to-queue',
  UPDATE_STATUS_JOB_COMMAND: 'update-status-job-command',
  CREATE_IF_NOT_EXIST_CHILD_JOBS_COMMAND: 'create-if-not-exist-child-jobs-command',
  SEND_EMAIL: 'send-email',
  PUSH_NOTIFICATION: 'push-notification',
  EMIT_EVENT: 'emit-event',
};
