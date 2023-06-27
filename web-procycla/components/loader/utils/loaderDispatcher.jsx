import { emitter } from './emitter';

export const loaderDispatcher = ({ dispatch }) => {
  emitter.on('SHOW', () => dispatch({ type: 'SHOW' }));
  emitter.on('HIDE', () => dispatch({ type: 'HIDE' }));
}
