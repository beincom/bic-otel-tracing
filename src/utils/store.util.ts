import { ClsService } from 'nestjs-cls';
import { TraceContext } from '../type';

export const createStore = (
  key: string,
  payload: TraceContext,
  cls?: ClsService<TraceContext>,
): TraceContext => {
  cls.setIfUndefined(key, payload);
  return cls.get(key);
};

export const updateStore = (
  key: string,
  payload: TraceContext,
  cls?: ClsService<TraceContext>,
): void => {
  return cls.set(key, payload);
};
