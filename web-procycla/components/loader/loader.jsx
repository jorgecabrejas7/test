import { emitter } from './utils/emitter'

export const loader = (isLoading) => {
    if(isLoading) emitter.emit('SHOW');
    else emitter.emit('HIDE');
}
